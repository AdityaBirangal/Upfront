import { deployedAddress } from './chain.service.js';

describe('deployedAddress', () => {
  it('picks V5 on Whitechain Sepolia, above 4.5', () => {
    expect(deployedAddress(1874, 'upfront')).toBe(
      '0xf28D496F897Ff6FF88425D1D618f79E0D7Ae7564',
    );
    expect(deployedAddress(1874, 'access')).toBe(
      '0x975EA3B186F15a5eCdee6fdC4e3924f167A84F05',
    );
  });

  it('returns undefined for an unknown chain', () => {
    expect(deployedAddress(1, 'upfront')).toBeUndefined();
  });
});
