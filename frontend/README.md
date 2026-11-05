# Upfront frontend

The web app for Upfront: businesses get paid early, investors get paid more. A seller turns a
receivable into units, the buyer approves it, and investors buy the units at a discount.

The wallet connection, balance, and backend status are real. Everything else runs in the browser:
roles, receivables, and holdings are kept in memory, so **a refresh clears them**. The app doesn't
call smart contracts, and the only backend call is the status check, so no transactions are sent,
no USDT moves, and PDFs aren't uploaded.

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
| `VITE_BACKEND_URL` | Backend address, including `/api`. Leave it unset to use `/api` on the same origin |

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
| `/app/admin` | Any wallet | Assign roles to wallets, and revoke them |
| `/app/seller` | Seller | Create receivables and list accepted ones |
| `/app/buyer` | Buyer | Accept or reject receivables |
| `/app/invest` | Investor | Buy units and see your portfolio |

The seller, buyer, and investor pages only open for a connected wallet that holds that role.

The header shows the backend status, and the connected wallet with its native token balance. It
warns if the wallet is on the wrong network, with a button to switch. The backend counts as online
when `GET /api/health` returns `{ "ok": true }`, and the app rechecks every 30 seconds.

## Deploying

On Vercel, the frontend and backend deploy as one project from `vercel.json` in the repo root. The
backend serves `/api/*` and the frontend serves everything else, so leave `VITE_BACKEND_URL` unset.
Set `VITE_CHAIN_ID=1874`, because Vite reads it at build time. Use `vercel dev` in the repo root to
run both locally.

Routes like `/app/admin` need to serve `index.html`. The `frontend` service in the root `vercel.json`
does this on Vercel, for paths under `/app`, so a new top-level route needs adding there too.
`public/_redirects` does it on Netlify and Cloudflare Pages.

## Try the full flow

Use at least two wallet accounts, because a buyer can't invest in their own receivable. Switch
accounts in the wallet and use the on-page links, because a refresh or a typed URL clears the data.

1. **Admin:** connect a wallet, then assign the Seller, Buyer, and Investor roles.
2. **Seller:** create a receivable for the buyer's wallet. **Use sample PDF** attaches a test
   document.
3. **Buyer:** accept the receivable.
4. **Seller:** enter a discount and investor cap under the accepted receivable, then click **List**.
5. **Investor:** buy units in the marketplace, and check them in the portfolio.

A receivable moves through these statuses:

```text
Created ──> Accepted ──> Listed ──> Funded
   └──────> Rejected
```

## Rules the app applies

- **Units:** 1 unit is 1 USDT, so a 10 USDT receivable has 10 units. Amounts are whole numbers.
- **Documents:** the PDF must be 5 MB or smaller. Its SHA-256 hash is computed in the browser, and
  only the hash is kept. A document can't be used twice unless its receivable was rejected.
- **Buyers:** the buyer's wallet must hold the Buyer role.
- **Due dates:** must be in the future. After the due date, a receivable can't be accepted, listed,
  or bought.
- **Pricing:** unit price is 1 USDT minus the discount. A 3% discount gives 0.97 USDT per unit.
- **Investor cap:** the most units one wallet can hold of a receivable.

## Known limits

- The admin page is open to every wallet.
- The buyer page and **My receivables** show all receivables, not only the connected wallet's.
- A seller can invest in their own receivable, because the seller's wallet isn't saved.
- A seller can't cancel a receivable, and the buyer can't open the PDF.

## Code layout

```text
public/sample-agreement.pdf   Test document for the seller form
src/
  App.tsx                     Routes and all shared in-memory state
  wagmi.ts                    Wallet and chain setup
  roles.ts                    Roles and role checks
  receivables.ts              Types, PDF checks, hashing, price math
  useNow.ts                   Clock that updates every second
  pages/                      One file per route
  components/
    WalletBar.tsx             Header with wallet and network controls
    WalletBalance.tsx         Native token balance of the connected wallet
    BackendStatus.tsx         Backend status from GET /health
    RequireRole.tsx           Blocks a page if the wallet lacks the role
    ReceivableCard.tsx        Receivable details, used on every role page
    ListForm.tsx              Seller's discount and cap form
    BuyForm.tsx               Investor's buy form
```

Built with Vite, React, TypeScript, react-router, wagmi, viem, and TanStack Query.
