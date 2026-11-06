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

Deploy `InvestorGate` beside the existing contracts, from an admin wallet. `GATE_SIGNER` is the address
of the backend's `GATE_SIGNER_KEY`, which can't be changed afterwards. To replace a gate, also set
`OLD_GATE`, and `REVOKE_WALLETS` as a comma-separated list of wallets it let in:

```bash
ACCESS_ADDRESS=<UpfrontAccess> GATE_SIGNER=<address> \
forge script script/DeployGate.s.sol --rpc-url whitechain_sepolia --account upfront-admin --broadcast \
  --verify --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/
```

Run the demo flow on the newest Whitechain Sepolia deployment, using the `upfront-*` keystores:

```bash
../scripts/demo-lifecycle.sh
```

Top up the demo wallets from Admin. It sends only what each wallet is short of:

```bash
forge script script/FundDemoWallets.s.sol --rpc-url whitechain_sepolia --account upfront-admin --broadcast
```
