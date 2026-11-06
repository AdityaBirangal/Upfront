# Demo transactions

Real transactions on Whitechain Sepolia (chain ID 1874), using real test USDT, on the final deployment
of [`Upfront`](https://explorer.testnet.whitechain.io/address/0x50ed2278ebcaa43ee213596881157a80e5041bc9).

Receivable #5 has a face value of 10 USDT, verified by the buyer, with two investors at a 10% discount.
They paid 9.00 USDT and received 10.00 USDT. It ended Settled, and the smart contract holds no USDT.

Before the real transfer, a transfer from Investor 1 to the Outsider was simulated and refused, so no
transaction exists for it. Settlement then paid whoever held the units.

| Step | Wallet | Result | Transaction |
|---|---|---|---|
| Create | Seller | 10 units minted to the seller | [`0x14609b41…`](https://explorer.testnet.whitechain.io/tx/0x14609b410abcf5da2924ea7c2ec6f9af94bb75c162c5b2cb6c753b8295e88f64) |
| Verify | Buyer | Verified tag set | [`0xc98ad067…`](https://explorer.testnet.whitechain.io/tx/0xc98ad067733550d855d8bd9be8c97b8f58aca246f73f053ceef9b0b696058b82) |
| List | Seller | 0.90 USDT per unit (10% discount), investor cap 6 | [`0x6d8b1a2a…`](https://explorer.testnet.whitechain.io/tx/0x6d8b1a2ade872bb25fc19b602e9523695bf63fedbf82db213cf4dbd1499ff9cb) |
| Approve | Investor 1 | 5.40 USDT allowance | [`0x6944eb04…`](https://explorer.testnet.whitechain.io/tx/0x6944eb04d6cc9d74e5bed16bf59cc1d94d1f74c2411b06c3685827d3be2d312a) |
| **Invest** | Investor 1 | **5.40 USDT to the seller and 6 units to the investor, in one transaction** | [`0x97ebf109…`](https://explorer.testnet.whitechain.io/tx/0x97ebf109a48e655c87444629e5fa6b66487207e3cd9ba17cf04507d5e61965fa) |
| Approve | Investor 2 | 3.60 USDT allowance | [`0x60ad8ed0…`](https://explorer.testnet.whitechain.io/tx/0x60ad8ed0d4e009d90302f14e599ea6b4b1c42fb71b143200397684e84e9136e9) |
| **Invest** | Investor 2 | **3.60 USDT to the seller and 4 units to the investor. Status becomes Funded** | [`0x9a3823ce…`](https://explorer.testnet.whitechain.io/tx/0x9a3823cee572eee0ec09d4d17c0248ce95d2522e389384d336bb18e46b97a4b3) |
| **Transfer** | Investor 1 | **2 units to Investor 2, allowed by the transfer rules** | [`0x3dd7390f…`](https://explorer.testnet.whitechain.io/tx/0x3dd7390fa67cee6e8dad68c41898d1d416a04fd9a4ddafd9d0fcf3e290ca7604) |
| Approve | Seller | 10 USDT allowance | [`0xaa423bec…`](https://explorer.testnet.whitechain.io/tx/0xaa423bec98c3423a03687eed17bced85c36b929db25ad828ad2dfd3863b5a2ed) |
| **Settle** | Seller | **One transaction pays 4 USDT to Investor 1 and 6 USDT to Investor 2, the new holder of 2 units** | [`0x43cbea02…`](https://explorer.testnet.whitechain.io/tx/0x43cbea02dd197d9293a21e2b5e677a84eac77a141ea746a6e47776e1c728f072) |

## World ID join

World ID's simulator on [`InvestorGate`](https://explorer.testnet.whitechain.io/address/0x5d008711c2301AE2C1cC45c4667971db02AD5292),
so these are staging proofs, not real humans. No Admin was involved in the join.

| Step | Wallet | Result | Transaction |
|---|---|---|---|
| Gate deployed | Admin | `InvestorGate` created and made an admin of `UpfrontAccess` | [`0x52893918…`](https://explorer.testnet.whitechain.io/tx/0x5289391812c81d94901ae1464b429caf7242ef7add7327a3c1fde9bd21605945) and [`0x401a614d…`](https://explorer.testnet.whitechain.io/tx/0x401a614d03d67175556863558d1d90676d455b9dc9a3a1a862c3939a415235f1) |
| **Join** | Test A | **Verified with World ID, and the wallet got the Investor role** | [`0x286dcc34…`](https://explorer.testnet.whitechain.io/tx/0x286dcc344221760786ecba4769e544601fee56f49c9b6de6b709f6b40b813a35) |
| Refused | Test B, same human | Refused before sending, so no transaction exists | None |

## Earlier run at a 3% discount

The same flow on the same deployment, before we moved the example deal to 10%.

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
