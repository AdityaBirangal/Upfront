import { ConfigService } from '@nestjs/config';
import { hashSignal } from '@worldcoin/idkit-core/hashing';
import { recoverTypedDataAddress, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { WorldService } from './world.service.js';

// Anvil's first default key. Public, and never used outside tests.
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const GATE = '0x5d008711c2301AE2C1cC45c4667971db02AD5292';
const WALLET = '0x48542534dF28c01768aCF552Effc30221e92b03f';
const NULLIFIER = '1234567890123456789012345678901234567890';

const settings = {
  CHAIN_ID: '1874',
  WORLD_RP_ID: 'rp_test',
  WORLD_ENVIRONMENT: 'staging',
  RP_SIGNING_KEY: KEY,
  GATE_SIGNER_KEY: KEY,
  GATE_ADDRESS: GATE,
};

const service = (overrides: Record<string, string> = {}) =>
  new WorldService(
    new ConfigService({ ...settings, ...overrides }) as ConfigService,
  );

const proof = (overrides: Record<string, unknown> = {}, response = {}) => ({
  protocol_version: '4.0',
  action: 'join-investors',
  environment: 'staging',
  responses: [
    {
      identifier: 'proof_of_human',
      signal_hash: hashSignal(WALLET.toLowerCase()),
      nullifier: NULLIFIER,
      ...response,
    },
  ],
  ...overrides,
});

const code = (error: unknown) => (error as { response?: { error?: string } }).response?.error;

describe('WorldService', () => {
  const worldReplies = (status: number, body: unknown) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

  beforeEach(() => {
    vi.stubGlobal('fetch', worldReplies(200, { success: true, environment: 'staging' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signs a voucher InvestorGate would accept', async () => {
    const { nullifierHash, expiry, signature } = await service().verify(proof(), WALLET);

    expect(nullifierHash).toBe(toHex(BigInt(NULLIFIER), { size: 32 }));
    expect(
      await recoverTypedDataAddress({
        domain: {
          name: 'Upfront InvestorGate',
          version: '7',
          chainId: 1874,
          verifyingContract: GATE,
        },
        types: {
          JoinVoucher: [
            { name: 'wallet', type: 'address' },
            { name: 'nullifierHash', type: 'bytes32' },
            { name: 'expiry', type: 'uint64' },
          ],
        },
        primaryType: 'JoinVoucher',
        message: { wallet: WALLET, nullifierHash, expiry: BigInt(expiry) },
        signature,
      }),
    ).toBe(privateKeyToAccount(KEY).address);
  });

  it('accepts a key pasted without 0x', async () => {
    const { signature } = await service({ GATE_SIGNER_KEY: KEY.slice(2) }).verify(proof(), WALLET);
    expect(signature).toMatch(/^0x/);
  });

  it('forwards the proof unchanged to World', async () => {
    const body = proof();
    await service().verify(body, WALLET);

    expect(fetch).toHaveBeenCalledWith(
      'https://developer.world.org/api/v4/verify/rp_test',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    );
  });

  it('accepts any casing of the same wallet', async () => {
    await expect(service().verify(proof(), WALLET.toLowerCase())).resolves.toBeDefined();
  });

  it.each([
    ['another wallet', proof({}, { signal_hash: hashSignal('0xother') }), 'wallet_mismatch'],
    ['no signal', proof({}, { signal_hash: undefined }), 'wallet_mismatch'],
    ['a legacy proof', proof({ protocol_version: '3.0' }), 'invalid_proof'],
    ['another credential', proof({}, { identifier: 'passport' }), 'invalid_proof'],
    ['another action', proof({ action: 'other' }), 'invalid_proof'],
    ['another environment', proof({ environment: 'production' }), 'invalid_proof'],
    ['two responses', proof({ responses: [{}, {}] }), 'invalid_proof'],
    ['a bad nullifier', proof({}, { nullifier: 'nope' }), 'invalid_proof'],
    ['no proof', undefined, 'invalid_proof'],
  ])('refuses %s without calling World', async (_name, body, expected) => {
    const error: unknown = await service().verify(body, WALLET).catch((e: unknown) => e);

    expect(code(error)).toBe(expected);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a bad wallet', async () => {
    const error: unknown = await service().verify(proof(), 'nope').catch((e: unknown) => e);
    expect(code(error)).toBe('invalid_wallet');
  });

  it.each([
    ['a refusal', 400, { success: false }],
    ['success false', 200, { success: false, environment: 'staging' }],
    ['another environment', 200, { success: true, environment: 'production' }],
  ])('refuses when World replies with %s', async (_name, status, body) => {
    vi.stubGlobal('fetch', worldReplies(status, body));
    const error: unknown = await service().verify(proof(), WALLET).catch((e: unknown) => e);

    expect(code(error)).toBe('invalid_proof');
  });

  it('reports World being down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const error: unknown = await service().verify(proof(), WALLET).catch((e: unknown) => e);

    expect(code(error)).toBe('world_unavailable');
  });

  it('turns itself off when settings are missing', async () => {
    const off = service({ RP_SIGNING_KEY: '', GATE_SIGNER_KEY: '', WORLD_RP_ID: '' });

    expect(code(await off.verify(proof(), WALLET).catch((e: unknown) => e))).toBe('world_unavailable');
    let thrown: unknown;
    try {
      off.rpContext();
    } catch (error) {
      thrown = error;
    }
    expect(code(thrown)).toBe('world_unavailable');
  });

  it('uses the configured action', async () => {
    const custom = service({ WORLD_ACTION: 'join-investors-2' });

    expect(custom.rpContext().action).toBe('join-investors-2');
    await expect(custom.verify(proof({ action: 'join-investors-2' }), WALLET)).resolves.toBeDefined();
    expect(code(await custom.verify(proof(), WALLET).catch((e: unknown) => e))).toBe('invalid_proof');
  });

  it('builds the request context IDKit needs', () => {
    expect(service().rpContext()).toMatchObject({
      action: 'join-investors',
      rp_id: 'rp_test',
      nonce: expect.stringMatching(/^0x/) as string,
      signature: expect.stringMatching(/^0x/) as string,
    });
  });
});
