# Demo transactions

Real transactions on Whitechain Sepolia (chain ID 1874), using real test USDT. The final demo run
replaces this list at V6.

## First real USDT payment (V3)

Smart contract: [`Upfront`](https://explorer.testnet.whitechain.io/address/0x994dd61016baf0a5d290729b4f095fc312d25714),
receivable #1, RCV-1001. Face value 10 USDT, listed at a 3% discount.

| Step | Wallet | Result | Transaction |
|---|---|---|---|
| Create | Seller | 10 units minted to the seller | [`0x53caea64…`](https://explorer.testnet.whitechain.io/tx/0x53caea64dc3f1e0cfae42dcfad32a245324ab53da47fa210f8ca10844dc9a359) |
| Verify | Buyer | Verified tag set | [`0x259200c9…`](https://explorer.testnet.whitechain.io/tx/0x259200c95cb07ba924b0b38c83c8cffea861c2751d66f4a166db4de114eb3fe7) |
| List | Seller | 0.97 USDT per unit, investor cap 6 | [`0x4d1c5670…`](https://explorer.testnet.whitechain.io/tx/0x4d1c5670385545c7f76803726e0df40c793b5014145adb72560cdaa3475917b4) |
| Approve | Investor 1 | 5.82 USDT allowance | [`0xd3c811be…`](https://explorer.testnet.whitechain.io/tx/0xd3c811be4da9163e0bd9a4dc936efc771999e4eb2fd1b64774f4d593bb43256c) |
| **Invest** | Investor 1 | **5.82 USDT to the seller and 6 units to the investor, in one transaction** | [`0x2e9a290b…`](https://explorer.testnet.whitechain.io/tx/0x2e9a290ba620adb901eea4b7f63abe2831d32055d1c80523b1a5d7ddb6c77a04) |
