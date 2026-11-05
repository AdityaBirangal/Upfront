# Upfront contracts

Foundry project. After a fresh clone, run `git submodule update --init --recursive`.

```bash
forge build
forge test                                     # includes fork tests, needs the public RPC
forge test --match-path "test/*.fork.t.sol"    # fork tests only
```

Import the deployer key once. It stays in Foundry's encrypted keystore, never in `.env`:

```bash
cast wallet import upfront-admin --interactive
```

Deploy and verify on Whitechain Sepolia:

```bash
forge script script/DeployProbe.s.sol --rpc-url whitechain_sepolia --account upfront-admin --broadcast \
  --verify --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/
```
