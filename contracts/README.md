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

Deploy and verify on Whitechain Sepolia. This also grants the demo roles:

```bash
forge script script/Deploy.s.sol --rpc-url whitechain_sepolia --account upfront-admin --broadcast \
  --verify --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/
```

Deploy to a local anvil chain, with mock USDT and anvil's default accounts as the demo wallets. On a
fresh anvil the addresses match `deployments.json`:

```bash
anvil
forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Set `GRANT_ROLES=false` on that command to start with no roles, for testing the Admin page.
