# Demo transactions

Real transactions on Whitechain Sepolia (chain ID 1874), using real test USDT, on the final deployment
of [`Upfront`](https://explorer.testnet.whitechain.io/address/0x50ed2278ebcaa43ee213596881157a80e5041bc9).

Receivable #1 has a face value of 10 USDT, verified by the buyer, with two investors at a 3% discount.
It ended Settled, and the smart contract never held any USDT.

Before the real transfer, a transfer from Investor 1 to the Outsider was simulated and refused with
`TransferNotAllowed`, so no transaction exists for it. Settlement then paid whoever held the units.

| Step | Wallet | Result | Transaction |
|---|---|---|---|
| Create | Seller | 10 units minted to the seller | [`0xece9ac5c…`](https://explorer.testnet.whitechain.io/tx/0xece9ac5ccd52ceee3ac01595f31488fa13b20ff5158b196ed05c18f55c278cf0) |
| Verify | Buyer | Verified tag set | [`0x5b34918b…`](https://explorer.testnet.whitechain.io/tx/0x5b34918b095ee46929d9afa9b2931cb9146daa2c6e428889b83e9ce472a80c9e) |
| List | Seller | 0.97 USDT per unit, investor cap 6 | [`0x06727fe4…`](https://explorer.testnet.whitechain.io/tx/0x06727fe47eaf885c99d5f408b4f62259299f6cfecdb0e7f64fc54382a0f4d6f1) |
| Approve | Investor 1 | 5.82 USDT allowance | [`0x14e767be…`](https://explorer.testnet.whitechain.io/tx/0x14e767be6f399d4562cf1ff921f88d90fb267df8de52fda8e42372abd22b94cb) |
| **Invest** | Investor 1 | **5.82 USDT to the seller and 6 units to the investor, in one transaction** | [`0x0583eb0e…`](https://explorer.testnet.whitechain.io/tx/0x0583eb0e9f956497c80233c37528bd36a118f9e0574353345b10316af302f099) |
| Approve | Investor 2 | 3.88 USDT allowance | [`0xcc83103e…`](https://explorer.testnet.whitechain.io/tx/0xcc83103ee31c1c1ee218fc617781930977e948f82a2f8247bf593a76cc67a130) |
| **Invest** | Investor 2 | **3.88 USDT to the seller and 4 units to the investor. Status becomes Funded** | [`0xe999f0f2…`](https://explorer.testnet.whitechain.io/tx/0xe999f0f2a155197956925fdd63b7911739f14747e8c48ed3521bdb6a43673d22) |
| **Transfer** | Investor 1 | **2 units to Investor 2, allowed by the transfer rules** | [`0xa69c8738…`](https://explorer.testnet.whitechain.io/tx/0xa69c8738927efd25cb17c91d2b57686c8db011f26f34d715d063cc009eea162f) |
| Approve | Seller | 10 USDT allowance | [`0x5408c3a5…`](https://explorer.testnet.whitechain.io/tx/0x5408c3a5040a589bbfee2203f85b286501323c167fd7b4f5466bc33c27b16967) |
| **Settle** | Seller | **One transaction pays 4 USDT to Investor 1 and 6 USDT to Investor 2, the new holder of 2 units** | [`0x54ec787e…`](https://explorer.testnet.whitechain.io/tx/0x54ec787e22d5c058def448bec01c57bfe7ccb9c50362ae54b8a94c6b079ca5b0) |
