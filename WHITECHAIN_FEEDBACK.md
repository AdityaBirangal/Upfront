# Whitechain feedback

A few honest notes from building Upfront on Whitechain Sepolia.

## What worked

- Foundry deployment and Blockscout verification worked first time, on every deploy, using
  `--verifier blockscout` and the explorer's `/api/` URL.
- The chain was steady. Blocks came quickly, gas stayed cheap, and a two-contract deploy cost about
  0.02 WBT.
- Test USDT behaved as we hoped. A Foundry fork test against the real token passed from the start, and
  changing an existing allowance works directly, unlike classic USDT.

## Where we got stuck

- **Test USDT:** the faucet only gives WBT. We had to work out that we could swap WBT for USDT through
  the pool, which took more time than anything else in setup.
- **Faucet limits:** 0.5 WBT per 24 hours goes quickly with six demo wallets to fund.
- **Log reads:** the public RPC refuses large `eth_getLogs` ranges, so our app reads events in chunks
  of 10,000 blocks.

## What the docs were missing

- How to get test USDT, which is required for the prize.
- The `eth_getLogs` range limit on the public RPC.
- Whether the testnet USDT needs a zero allowance first. We had to test this ourselves.
- The testnet page says no third-party endpoint serves the network, but Ankr offers one.
