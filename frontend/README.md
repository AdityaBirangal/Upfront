# Upfront frontend

The web app for Upfront: businesses get paid early, investors get paid more. A seller turns a
receivable into units, the buyer approves it, and investors buy the units at a discount.

Roles and receivables live in the `UpfrontAccess` and `Upfront` smart contracts, and agreement PDFs
are stored by the backend. Only the document hash goes onchain. Accepting, listing, buying, and
settlement aren't in the deployed smart contracts yet, so those pages show chain data without
actions, and no USDT moves.

## Getting started

You need Node and a browser wallet such as MetaMask.

```bash
npm install
cp .env.example .env
npm run dev
```

| Variable | Meaning |
|---|---|
| `VITE_CHAIN_ID` | `31337` for local Anvil, or `1874` for Whitechain Sepolia (the default when unset) |
| `VITE_RPC_URL` | RPC address. Leave it unset to use the chain's public RPC |
| `VITE_BACKEND_URL` | Backend address, such as `http://localhost:8787`. Needed to create receivables |

Contract addresses come from `src/generated/`, picked by chain ID. To refresh them after a contract
change, run `forge build` in `contracts/`, then `node scripts/sync-abi.mjs` from the repo root.

The backend must allow this app's origin. Locally, start it with `CHAIN_ID` and `RPC_URL` for the
same chain, and `ALLOWED_ORIGIN=http://localhost:5173`.

| Command | Does |
|---|---|
| `npm run dev` | Starts the dev server |
| `npm run build` | Type checks and builds to `dist/` |
| `npm run lint` | Runs oxlint |
| `npm run preview` | Serves the production build |

## Pages

| Route | For | What you can do |
|---|---|---|
| `/` | Everyone | Open the app |
| `/app` | Everyone | Choose a role |
| `/app/admin` | Anyone views. Admins change | Assign roles to wallets, and revoke them |
| `/app/seller` | Seller | Create receivables, and see your own |
| `/app/buyer` | Buyer | See receivables that name you as the buyer |
| `/app/invest` | Investor | See listed receivables and the units you hold |
| `/app/receivable/:id` | Everyone | See one receivable, and check its document |

The seller, buyer, and investor pages only open for a connected wallet that holds that role. `/app`
highlights the roles the connected wallet holds.

Every transaction shows its progress: confirm in the wallet, waiting, then confirmed with an
explorer link, or a plain reason if it fails. Pages refresh their chain data after each one.

The header shows the backend status, and the connected wallet with its native token balance. It
warns if the wallet is on the wrong network, with a button to switch. The backend counts as online
when `GET /health` returns `{ "ok": true }`, and the app rechecks every 30 seconds.

## Deploying

The app is a static site. Set the host's root directory to `frontend`, the build command to
`npm run build`, and the output directory to `dist`. Set `VITE_CHAIN_ID=1874` and `VITE_BACKEND_URL`
on the host, because Vite reads them at build time.

Routes like `/app/admin` need every path to serve `index.html`. `vercel.json` does this on Vercel,
and `public/_redirects` does it on Netlify and Cloudflare Pages.

## Try the full flow

Use separate wallet accounts for the seller and buyer, because a seller can't be its own buyer.

1. **Admin:** connect an admin wallet, then assign the Seller and Buyer roles.
2. **Seller:** create a receivable for the buyer's wallet. **Use sample PDF** attaches a test
   document. The page uploads the PDF, then asks the wallet to sign `createReceivable`.
3. **Seller:** open **View details** on the new receivable. The badge confirms the stored PDF matches
   the hash onchain.
4. **Buyer:** switch to the buyer's account. The receivable appears on the buyer page.

Everything survives a refresh, because it's read from the chain.

## Rules the app applies

- **Units:** 1 unit is 1 USDT, so a 10 USDT receivable has 10 units. Amounts are whole numbers.
- **Documents:** the PDF must be 5 MB or smaller. Its SHA-256 hash is computed in the browser. A
  document can back only one receivable. **Use sample PDF** adds a timestamp to the file each time,
  so every sample is a new document.
- **Buyers:** the buyer's wallet must hold the Buyer role, and can't be the seller.
- **Due dates:** must be in the future.
- **Admins:** the last admin can't be revoked, and a role a wallet already holds can't be assigned
  again.

The app checks these before asking the wallet to sign, and the smart contract enforces them again.

## Known limits

- Buyers can't accept or reject yet, sellers can't cancel or list, and investors can't buy.
- Anyone with the link can open a document. The backend doesn't check who's asking.

## Code layout

```text
public/sample-agreement.pdf   Test document for the seller form
src/
  App.tsx                     Routes
  wagmi.ts                    Wallet and chain setup
  contracts.ts                Contract addresses, ABIs, and role IDs for the chosen chain
  chain.ts                    Hooks that read roles and receivables
  tx.ts                       Runs a transaction and turns errors into plain sentences
  backend.ts                  Backend address and document upload
  roles.ts                    Role names
  receivables.ts              Receivable type, statuses, PDF checks, hashing
  generated/                  ABIs and deployments from scripts/sync-abi.mjs. Don't edit
  pages/                      One file per route
  components/
    WalletBar.tsx             Header with wallet and network controls
    WalletBalance.tsx         Native token balance of the connected wallet
    BackendStatus.tsx         Backend status from GET /health
    RequireRole.tsx           Blocks a page if the wallet lacks the role
    TxStatus.tsx              Progress and result of a transaction
    ReceivableCard.tsx        Receivable details, used on every role page
    ReceivableList.tsx        Loading, error, and empty states for a list
    DocumentBadge.tsx         Checks a stored PDF against its onchain hash
```

Built with Vite, React, TypeScript, react-router, wagmi, viem, and TanStack Query.
