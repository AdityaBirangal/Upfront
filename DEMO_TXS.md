# Demo transactions

Real transactions on Whitechain Sepolia (chain ID 1874), using real test USDT. The final demo run
replaces this list at V6.

## Seller settlement with real USDT (V4.5)

This is the flow we demo. Smart contract: [`Upfront`](https://explorer.testnet.whitechain.io/address/0x16f1dad004f58e77ccc961c711dec82d1bb1116a).
Receivable #1, face value 10 USDT, verified by the buyer, two investors at a 3% discount. It ended
Settled. Investors earned 0.18 and 0.12 USDT, and the smart contract never held any USDT.

| Step | Wallet | Result | Transaction |
|---|---|---|---|
| Create | Seller | 10 units minted to the seller | [`0xdd7511be…`](https://explorer.testnet.whitechain.io/tx/0xdd7511bea5aa631ffcf395cf9ce1b7b48071787419e4635e2c2bfbe53019aa2d) |
| Verify | Buyer | Verified tag set | [`0x7c4e41ca…`](https://explorer.testnet.whitechain.io/tx/0x7c4e41caab706ca908fc57d2983649a3a36da7ea3a776a03556db270ccbd06f1) |
| List | Seller | 0.97 USDT per unit, investor cap 6 | [`0xd1735adb…`](https://explorer.testnet.whitechain.io/tx/0xd1735adbd34f7d945780d05b60654bcf529b52c7ae9528c75006f4c78a28def6) |
| Approve | Investor 1 | 5.82 USDT allowance | [`0x310a551d…`](https://explorer.testnet.whitechain.io/tx/0x310a551d9f893f132e61d705cd814c800eccff1d77ccf0ddf0ee20492f0253cc) |
| **Invest** | Investor 1 | **5.82 USDT to the seller and 6 units to the investor, in one transaction** | [`0xe729cb76…`](https://explorer.testnet.whitechain.io/tx/0xe729cb7663e9c9f73c64afe8b99a5acbe891a70bd742ea6c24d5f54741c2c87c) |
| Approve | Investor 2 | 3.88 USDT allowance | [`0x79b1777d…`](https://explorer.testnet.whitechain.io/tx/0x79b1777dc4c7ef1566ec5e10b68becc01c8a059bf699f2f60d01860655e1bb3d) |
| **Invest** | Investor 2 | **3.88 USDT to the seller and 4 units to the investor. Status becomes Funded** | [`0x8a6c562c…`](https://explorer.testnet.whitechain.io/tx/0x8a6c562c36d8b5fcf7cabff155d0b1b03aea3e4820059f31bb00f9b3787061fa) |
| Approve | Seller | 10 USDT allowance | [`0x73c10f93…`](https://explorer.testnet.whitechain.io/tx/0x73c10f939adf016a7a29d236053acc92c46137c6fb309499eda062d5f506e06a) |
| **Settle** | Seller | **One transaction pays 6 USDT to Investor 1 and 4 USDT to Investor 2, and burns all units** | [`0x5dc57cfd…`](https://explorer.testnet.whitechain.io/tx/0x5dc57cfd3b401db3cd993ab0fe721aa2c4f7dad9b68ccfe5a2897a5d97250f0e) |

## Full lifecycle with real USDT (V4, replaced)

Smart contract: [`Upfront`](https://explorer.testnet.whitechain.io/address/0xb4322700bfc3bca3bbbee54fcb14ae661001c40e).
The smart contract ended holding 0 USDT.

### RCV-1001: paid in full

Face value 10 USDT, verified by the buyer, two investors at a 3% discount. It ended Settled.

| Step | Wallet | Result | Transaction |
|---|---|---|---|
| Create RCV-1001 | Seller | 10 units minted to the seller | [`0xb583b0bb…`](https://explorer.testnet.whitechain.io/tx/0xb583b0bbbeb2a38a5331ee2a0e730246804bc3ef0a8b34d071a966e0573fa6df) |
| Verify RCV-1001 | Buyer | Verified tag set | [`0x6bb46027…`](https://explorer.testnet.whitechain.io/tx/0x6bb46027f1993d7392f74b444ecd889ab10fdfc215ec09db7ecead9450b81b38) |
| List RCV-1001 | Seller | 0.97 USDT per unit, investor cap 6 | [`0xd2560219…`](https://explorer.testnet.whitechain.io/tx/0xd256021983ccdf20b3639b93933fff0ea67ee6f3e108531f5921920b9d782deb) |
| Approve | Investor 1 | 5.82 USDT allowance | [`0x05dad164…`](https://explorer.testnet.whitechain.io/tx/0x05dad1643ee4aca0f96236754b802472fa4717b1e24e6dc139be06f239aa727e) |
| **Invest** | Investor 1 | **5.82 USDT to the seller, 6 units to the investor, in one transaction** | [`0xadff5563…`](https://explorer.testnet.whitechain.io/tx/0xadff556367b61047a783d74a5c25828c0583e226a826f27210d5b08b3118bf27) |
| Approve | Investor 2 | 4.85 USDT allowance | [`0x6b64ab6e…`](https://explorer.testnet.whitechain.io/tx/0x6b64ab6ea6c0bf3e2414c8f030e610c64922abb4f209dfb28813b3679777f6e6) |
| **Invest** | Investor 2 | **3.88 USDT to the seller, 4 units to the investor. Status becomes Funded** | [`0x9bd10705…`](https://explorer.testnet.whitechain.io/tx/0x9bd10705a0b9446736c8a9ca71e562d4d09b76be53c49c10d495a8368f31eaa2) |
| Approve | Buyer | 10 USDT allowance | [`0x1a4924ff…`](https://explorer.testnet.whitechain.io/tx/0x1a4924ff4229552a641ac497bcb76f4b0ef60866a6d84042370a334f934416d0) |
| **Settle** | Buyer | **10 USDT from the buyer into the smart contract** | [`0x2fab5298…`](https://explorer.testnet.whitechain.io/tx/0x2fab52985daa7fab200417eba5997fe9bc8a2afb7c238f919e7dbfed3b79726c) |
| **Claim** | Investor 1 | **6 units burned, 6 USDT paid. Profit 0.18 USDT** | [`0xd2228239…`](https://explorer.testnet.whitechain.io/tx/0xd222823933356c6aa9e90f06e892e8454640def065cb2f1de6eb83a9d5837f71) |
| **Claim** | Investor 2 | **4 units burned, 4 USDT paid. Profit 0.12 USDT** | [`0x29f66ca0…`](https://explorer.testnet.whitechain.io/tx/0x29f66ca082b4e1360c76b5ed15d7d7a9ee8ababadc3476b94724ebc3e954e5a8) |

### RCV-1002: unpaid

Face value 10 USDT, not verified, one unit sold, and the buyer didn't pay. It ended Defaulted, and
Investor 2 lost the 0.97 USDT paid. That risk is what the discount pays for.

| Step | Wallet | Result | Transaction |
|---|---|---|---|
| Create RCV-1002 | Seller | 10 units minted to the seller | [`0x5393d66e…`](https://explorer.testnet.whitechain.io/tx/0x5393d66e30476178a34a12d4f5ed4d27cf9b03b64a0859f16e292c48c62e9bfd) |
| List RCV-1002 | Seller | Listed without verification | [`0xeaae015c…`](https://explorer.testnet.whitechain.io/tx/0xeaae015c3060dacb9f069d39f08b6a6c69a7084cc2728a3761383f07cf5af9ec) |
| Invest | Investor 2 | 0.97 USDT to the seller, 1 unit to the investor | [`0xb172c5e2…`](https://explorer.testnet.whitechain.io/tx/0xb172c5e24e7ff6e299fe31620b7f3453b5121e3a76a47b160fcdf845f4a1a8e6) |
| **Mark default** | Investor 1 | **Unpaid after the grace period, so anyone can record it** | [`0x832872e3…`](https://explorer.testnet.whitechain.io/tx/0x832872e3101218745d418891b7a47d47d2dcf0fe847286f887ef9c60cfb526d2) |

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
