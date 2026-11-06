import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashSignal } from '@worldcoin/idkit-core/hashing';
import { signRequest } from '@worldcoin/idkit-core/signing';
import { getAddress, isAddress, toHex } from 'viem';
import type { Address, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { deployedAddress } from '../chain/chain.service.js';

const DEFAULT_ACTION = 'join-investors';
const VOUCHER_TTL_SECONDS = 600;
const WORLD_TIMEOUT_MS = 10_000;
const UNAVAILABLE = ['world_unavailable', HttpStatus.SERVICE_UNAVAILABLE] as const;

// Must match the EIP-712 domain and type in contracts/src/InvestorGate.sol.
const VOUCHER_DOMAIN = { name: 'Upfront InvestorGate', version: '7' } as const;
const VOUCHER_TYPES = {
  JoinVoucher: [
    { name: 'wallet', type: 'address' },
    { name: 'nullifierHash', type: 'bytes32' },
    { name: 'expiry', type: 'uint64' },
  ],
} as const;

type WorldProof = {
  protocol_version?: unknown;
  action?: unknown;
  environment?: unknown;
  responses?: {
    identifier?: unknown;
    signal_hash?: unknown;
    nullifier?: unknown;
  }[];
};

function refuse(error: string, status = HttpStatus.BAD_REQUEST): never {
  throw new HttpException({ error }, status);
}

@Injectable()
export class WorldService {
  private readonly logger = new Logger(WorldService.name);
  private readonly chainId: number;
  private readonly rpId?: string;
  private readonly environment: string;
  private readonly action: string;
  private readonly rpSigningKey?: string;
  private readonly gateSignerKey?: Hex;
  private readonly gate?: Address;

  constructor(config: ConfigService) {
    this.chainId = Number(config.get('CHAIN_ID') || 31337);
    this.rpId = config.get<string>('WORLD_RP_ID') || undefined;
    this.environment = config.get<string>('WORLD_ENVIRONMENT') || 'production';
    this.action = config.get<string>('WORLD_ACTION') || DEFAULT_ACTION;
    this.rpSigningKey = config.get<string>('RP_SIGNING_KEY') || undefined;
    const signerKey = config.get<string>('GATE_SIGNER_KEY');
    this.gateSignerKey = signerKey
      ? (`0x${signerKey.replace(/^0x/, '')}` as Hex)
      : undefined;
    this.gate =
      config.get<Address>('GATE_ADDRESS') ||
      deployedAddress(this.chainId, 'gate');
  }

  /** Signs a World request. The client can't do this, because the key must stay secret. */
  rpContext() {
    if (!this.rpId || !this.rpSigningKey) refuse(...UNAVAILABLE);
    const signed = signRequest({
      signingKeyHex: this.rpSigningKey,
      action: this.action,
    });
    return {
      action: this.action,
      rp_id: this.rpId,
      nonce: signed.nonce,
      created_at: signed.createdAt,
      expires_at: signed.expiresAt,
      signature: signed.sig,
    };
  }

  /** Checks a proof, then signs a voucher that InvestorGate accepts for this wallet only. */
  async verify(proof: unknown, wallet: unknown) {
    if (!this.rpId || !this.gateSignerKey || !this.gate) refuse(...UNAVAILABLE);
    if (typeof wallet !== 'string' || !isAddress(wallet, { strict: false })) {
      refuse('invalid_wallet');
    }
    const address = getAddress(wallet.toLowerCase());
    const nullifierHash = this.checkProof(proof as WorldProof, address);
    await this.verifyWithWorld(proof);
    this.logger.log(`World proof accepted: ${address} ${nullifierHash}`);

    const expiry = Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS;
    const signature = await privateKeyToAccount(
      this.gateSignerKey,
    ).signTypedData({
      domain: {
        ...VOUCHER_DOMAIN,
        chainId: this.chainId,
        verifyingContract: this.gate,
      },
      types: VOUCHER_TYPES,
      primaryType: 'JoinVoucher',
      message: { wallet: address, nullifierHash, expiry: BigInt(expiry) },
    });
    return { nullifierHash, expiry, signature };
  }

  /**
   * World's API doesn't know which wallet or credential we want, so these checks are ours. Without
   * them a proof could be reused for another wallet, or another credential's different nullifier
   * could let one human join twice. Legacy proofs are refused for the same reason.
   */
  private checkProof(proof: WorldProof, wallet: Address): Hex {
    const [response] = proof?.responses ?? [];
    if (
      proof?.responses?.length !== 1 ||
      proof.protocol_version !== '4.0' ||
      proof.action !== this.action ||
      proof.environment !== this.environment ||
      response.identifier !== 'proof_of_human' ||
      typeof response.nullifier !== 'string'
    ) {
      refuse('invalid_proof');
    }
    if (response.signal_hash !== hashSignal(wallet.toLowerCase())) {
      refuse('wallet_mismatch');
    }
    try {
      return toHex(BigInt(response.nullifier), { size: 32 });
    } catch {
      refuse('invalid_proof');
    }
  }

  private async verifyWithWorld(proof: unknown) {
    let response: Response;
    try {
      response = await fetch(
        `https://developer.world.org/api/v4/verify/${this.rpId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proof),
          signal: AbortSignal.timeout(WORLD_TIMEOUT_MS),
        },
      );
    } catch (error) {
      this.logger.error(`World verify failed: ${String(error)}`);
      refuse(...UNAVAILABLE);
    }
    const result = (await response.json().catch(() => null)) as {
      success?: unknown;
      environment?: unknown;
    } | null;
    if (
      !response.ok ||
      result?.success !== true ||
      (result.environment !== undefined &&
        result.environment !== this.environment)
    ) {
      this.logger.warn(
        `World refused a proof (${response.status}): ${JSON.stringify(result)}`,
      );
      refuse('invalid_proof');
    }
  }
}
