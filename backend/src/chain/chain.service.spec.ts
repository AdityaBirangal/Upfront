import { deployedAddress } from './chain.service.js';

describe('deployedAddress', () => {
  it('picks V6 on Whitechain Sepolia, the newest version', () => {
    expect(deployedAddress(1874, 'upfront')).toBe(
      '0x50eD2278EBCAA43eE213596881157a80e5041BC9',
    );
    expect(deployedAddress(1874, 'access')).toBe(
      '0x7f8dF0d47e0265Df7E1f8AF1d091757B193cECd2',
    );
  });

  it('returns undefined for an unknown chain', () => {
    expect(deployedAddress(1, 'upfront')).toBeUndefined();
  });
});
