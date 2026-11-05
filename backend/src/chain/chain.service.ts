import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Address,
  createPublicClient,
  http,
  parseAbi,
  PublicClient,
} from 'viem';
import { deployments } from '../generated/deployments.js';

// Both contracts expose this. Move to the generated ABIs once they land at V1.
const versionAbi = parseAbi(['function VERSION() view returns (uint256)']);
const RPC_TIMEOUT_MS = 3_000;

type Deployment = { upfront?: Address; access?: Address };
type ChainEntry = { versions: Record<string, Deployment> };

// The highest version deployed on this chain that has the given contract.
function deployedAddress(chainId: number, key: keyof Deployment) {
  const chains = deployments as unknown as Record<string, ChainEntry>;
  return Object.entries(chains[chainId]?.versions ?? {})
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([, deployment]) => deployment[key])
    .find(Boolean);
}

@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);
  private readonly client: PublicClient;
  private readonly chainId: number;
  private readonly upfront: Address | null;
  private readonly access: Address | null;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.chainId = Number(config.get('CHAIN_ID') || 31337);
    this.upfront =
      config.get<Address>('UPFRONT_ADDRESS') ||
      deployedAddress(this.chainId, 'upfront') ||
      null;
    this.access =
      config.get<Address>('ACCESS_ADDRESS') ||
      deployedAddress(this.chainId, 'access') ||
      null;
    this.client = createPublicClient({
      transport: http(config.get('RPC_URL') || 'http://127.0.0.1:8545', {
        timeout: RPC_TIMEOUT_MS,
        retryCount: 0,
      }),
    });
  }

  // A chain problem shows as null versions. Documents still work without the chain.
  async status() {
    const [upfrontVersion, accessVersion] = await Promise.all([
      this.readVersion(this.upfront),
      this.readVersion(this.access),
    ]);
    return {
      chainId: this.chainId,
      upfront: this.upfront,
      upfrontVersion,
      accessVersion,
    };
  }

  private async readVersion(address: Address | null) {
    if (!address) return null;
    try {
      const version = await this.client.readContract({
        address,
        abi: versionAbi,
        functionName: 'VERSION',
      });
      return Number(version);
    } catch (error) {
      this.logger.warn(`VERSION read failed for ${address}: ${String(error)}`);
      return null;
    }
  }
}
