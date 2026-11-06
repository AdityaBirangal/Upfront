# Upfront: 4-minute demo video

**Target length: 3:50.** ETHGlobal rejects anything under 2:00 or over 4:00 at upload. About 525 spoken
words, which leaves a little room for clicks.

**If the dry run goes over 3:55, cut in this order:** first "At a hundred and fifty deals a year, that's
thirteen and a half million in revenue" (the number stays on the slide), then "Here's the builder."

**Who it's for:** Whitechain's *Tokenize: Real World Finance* judges, then ETHGlobal's finalist judges.
The same 4 minutes also works as the live finalist demo, which has 4 minutes to present plus 3 for
questions.

## Rules we must not break

ETHGlobal Mumbai and Whitechain rules:

- 2 to 4 minutes long. Export at 1080p, never below 720p.
- **Use your own voice.** No AI or text-to-speech voiceover, and no music with captions instead of talking.
- **Don't speed the footage up.** You can cut out waiting, such as wallet pop-ups and confirmations.
- Don't record on a phone. Record in a quiet room with no echo.
- Keep the backstory to about 20 seconds.
- Whitechain wants **every party in the flow on screen**, at least one full lifecycle step, and transfer
  rules that the contract enforces. A token that has only a mint button and no rules won't place.
- Submissions close **Saturday 7 November, 9:00 am IST**. Paste the video link into the README, where
  it says `VIDEO_LINK`.

## Where each judging point shows up

| What judges look for | Our moment | Time |
|---|---|---|
| A real problem, quickly | $100M contract, client pays at the end | 0:00 |
| Clear issuer, investor and business user | Admin, Seller, Client and two Investors, each on screen | 0:35 to 2:45 |
| Rules enforced in the contract | Allowlist, investor cap, transfer limits, maturity | 0:35, 1:22, 2:00 |
| Compliance that can scale | Investors self-onboard with World ID, with a sanctions check | 0:35 |
| A full lifecycle onchain | Create, verify, list, invest, settle | 0:52 to 2:45 |
| USDT settled on Whitechain | The settlement transaction on the explorer | 2:30 |
| Business model (Whitechain asked for it) | The `/business` slide | 2:45 |
| The size of the opportunity | $6.7T data centre build-out, $800B to builders, on the same slide | 3:20 |
| WOW | One transaction paying every investor | 2:30 |

---

## The script

### 1. Hook (0:00 to 0:20)

**Screen:** The upfront.web.app hero. Scroll slowly to the "Winning the contract is the easy part" section
and its comparison table.

> A builder wins a hundred-million-dollar data centre contract from a global tech company.
> Great news, except the client pays at the end, and the builder has to pay for land, steel and
> thousands of workers now. Banks take weeks and want collateral. That's the gap Upfront fills.

### 2. What it is (0:20 to 0:35)

**Screen:** The "How it works" section, while the flow animation plays.

> Upfront turns a signed contract into funding. The builder sells units of its future repayment to
> approved investors at a discount, and gets USDT today. When the client pays, one transaction on
> Whitechain pays every investor.

### 3. Who can take part (0:35 to 0:52)

**Screen:** The Admin profile on `/app/admin`, showing the Roles list. If World ID onboarding is built by
the time you record, cut for 3 seconds to an investor verifying with World ID and getting the Investor
role, and change "will soon onboard" to "onboard".

> Every party has a wallet and a role, and the contract only lets approved wallets act. Investors will
> soon onboard themselves with World ID: their passport proves they're not from a sanctioned country.
> Sellers, clients, and anyone World ID can't verify are approved by our admin, who can't move anyone's
> money.

### 4. Seller creates the receivable (0:52 to 1:12)

**Screen:** The Seller profile goes to **Sell**, then **Create receivable**. Drop in the PDF, then enter
the client's wallet, an amount of 10 and the due date. Click **Create receivable**, show the wallet pop-up
**once**, and cut to the confirmed transaction.

> Here's the builder. It uploads the signed agreement. The PDF stays offchain, but its SHA-256 hash
> goes onchain, so nobody can swap the document later. It names the client's wallet and the amount,
> ten test USDT standing in for a hundred million dollars, and a due date. That mints ten ERC-1155 units.

### 5. Client verifies (1:12 to 1:22)

**Screen:** The Client profile goes to **Verify**, opens the receivable, and clicks **Verify**.

> Now the client. It sees the agreement that names it, and verifies it from its own wallet. Only the
> named client can do this, and it can't be undone.

### 6. Seller lists the units (1:22 to 1:32)

**Screen:** The Seller profile clicks **List for investors**, sets a 10% discount and an investor cap of
6, and clicks **List**.

> The builder lists the units at a ten percent discount, ninety cents each, with a cap of six units
> per investor.

### 7. Investors buy (1:32 to 2:00)

**Screen:** The Investor 1 profile goes to **Invest**, enters 6 units, then clicks **Approve USDT** and
**Buy units**. Show the funding bar on the receivable. Cut to Investor 2 buying 4 units, and show the
status change to **Funded**.

> An investor buys six units. In one transaction, five dollars forty of USDT goes to the builder and
> the units go to the investor. Either both happen, or nothing moves. A second investor takes the last
> four, and it's funded. The builder has its cash in minutes, with no bank and no collateral.

### 8. The rules (2:00 to 2:15)

**Screen:** The landing page's "Rules nobody can switch off" section. Then cut for 3 seconds to a
terminal showing 10 passing tests:

```bash
cd contracts && forge test --match-path test/Upfront.t.sol --match-test test_Transfer
```

> These units are restricted. They move between approved investors, but never to an outsider, the
> seller or the client, never over the cap, and never after the due date. Every rule runs inside the
> contract's transfer hook, and our tests cover every line.

### 9. Settle, with onchain proof (2:15 to 2:45)

**Screen:** The Seller profile clicks **Settle**, approves 10 USDT, then settles. Show the status change
to **Settled**. Click through to the transaction on the Whitechain explorer and open its **Token
transfers** tab, which shows one USDT payment to each investor.

> Before the due date, the builder settles. One transaction pays one USDT per unit to whoever holds the
> units right now. Here it is on the Whitechain explorer: ten USDT to two investors, in a single
> transaction. A bank transfer can't move money and a restricted token together, or pay every holder
> at once. USDT on Whitechain can.

### 10. Business model slide (2:45 to 3:30)

**Screen:** `upfront.web.app/business`, a single slide with no scrolling. Hold it for the whole 45
seconds, and move the cursor to each part as you name it: the headline, then the **One $100M contract**
card, **Revenue as deals grow**, **How we grow**, and last the blue **The potential** band.

> How does Upfront make money? We take half a percent of what a seller raises, and only when a deal
> funds. On that hundred-million-dollar contract, investors pay ninety million, we earn four hundred and
> fifty thousand, and the builder gets the rest today. Investors pay nothing extra. At a hundred and
> fifty deals a year, that's thirteen and a half million in revenue. We grow through the client: it
> verifies every agreement, so one client brings all of its contractors. And the potential is huge. Data
> centres alone need six point seven trillion dollars by 2030, and eight hundred billion of that goes to
> builders like ours. Fund just one percent of it, and that's thirty-six million dollars for Upfront.

**How to present it:**

- **Say the headline first.** It's the whole model in one sentence.
- **Say the big numbers, not every number:** $450K per deal, $13.5M at scale, then the three in the
  blue band. Viewers can pause to read the rest.
- **Move left to right**, in the order people read.
- **Don't read the footnote aloud.** It's there so the "planned" and "illustrative" caveats are visible.

### 11. The close (3:30 to 3:45)

**Screen:** The landing hero, with the URL and the GitHub repo on screen.

> Upfront: big contracts shouldn't wait for big banks. It's live on Whitechain Sepolia today.

**End card:** upfront.web.app · github.com/AdityaBirangal/Upfront · Aditya Birangal and Niranjan Girhe

---

## Recording plan

### Before you hit record

- **Use one Chrome profile per role:** Admin, Seller, Client, Investor 1 and Investor 2. Give each
  profile its own name and colour, and put one wallet in each. Switching roles then means switching
  windows, and the profile name in the corner tells viewers who's acting.
- **Fund the wallets.** Every wallet needs WBT for gas. Investor 1 needs at least 5.40 USDT and
  Investor 2 at least 3.60. The Seller needs **at least 1 USDT on top of** what it raises, because it
  receives 9 and must repay 10.
- **Use a fresh PDF.** The same agreement can't back two active receivables, and changing one character
  changes the hash.
- **Set the due date about an hour ahead**, so you can settle within the take.
- **Set up the screen:** a 1920×1080 window at 110 to 125% zoom, no bookmarks bar, Do Not Disturb on,
  and one theme throughout.
- **Deploy `/business` to upfront.web.app first**, so the address bar shows the real URL.
- **Do one full dry run with a stopwatch.**

### Recording and editing

- Record each section as its own clip with Screen Studio, OBS or QuickTime. Recording the voiceover
  afterwards, over the edited footage, makes the timing much easier to hit.
- Show the wallet pop-up in full **once**, at step 4, to prove the signing is real, and cut it from later
  steps. Cutting waiting is allowed. Speeding up isn't.
- Small role labels in a corner, such as "Seller · ABC Builder", are fine. They label the screen; they
  don't replace your voice.
- Export as a 1080p MP4 and check that it runs 3:40 to 3:55.

### If something breaks

- If the testnet is slow, use the transactions for receivable #5 in `DEMO_TXS.md` for the explorer shot.
- The landing page's **See a real settlement** button opens a real two-investor settlement.

---

## Likely questions in the finalist Q&A

- **What if the seller doesn't repay?** Today there's no collateral. After the due date the receivable
  shows Defaulted, and investors can see it. Planned: a 0.5% protection pool per raise, and
  client-paid escrow.
- **Why not a bank, or a factoring company?** Factoring buys invoices once the work is billed, and banks
  want collateral. Upfront funds a large contract before the first invoice, from approved investors
  anywhere, with atomic settlement and resale.
- **Which markets first?** Ones with clear rules for stablecoins, starting with data centre builders and
  their blue-chip clients.
- **How does an investor get approved?** Soon, by themselves: they present a passport credential
  through World ID, and if it isn't from an OFAC-sanctioned country, their wallet gets the Investor role.
  Upfront never sees the passport itself. Anyone who can't pass that check can still be approved by
  the admin by hand.
- **What about sellers and clients?** They're businesses, so they go through KYB, and the admin grants
  their roles. World ID is for individual investors.
- **Is this legal?** Production needs licensing in each market, business checks for sellers and
  clients, and a legal agreement behind each token. We say so in the README.
- **The fee isn't in the contract?** Correct, it's planned. Say so plainly. The page says so too.
- **Why Whitechain?** USDT settlement, cheap and fast blocks, and WhiteBIT as a place for investors to
  fund and for sellers to cash out.
- **What did you build this weekend?** Two verified contracts with every line tested, a React app, a
  document backend, and a full lifecycle on Whitechain Sepolia with real test USDT.

---

## Read-aloud version

Read this straight through to practise your pace. It should take about 3 minutes 30 seconds, and the
clicks add the rest.

A builder wins a hundred-million-dollar data centre contract from a global tech company. Great
news, except the client pays at the end, and the builder has to pay for land, steel and thousands of
workers now. Banks take weeks and want collateral. That's the gap Upfront fills.

Upfront turns a signed contract into funding. The builder sells units of its future repayment to
approved investors at a discount, and gets USDT today. When the client pays, one transaction on
Whitechain pays every investor.

Every party has a wallet and a role, and the contract only lets approved wallets act. Investors will soon
onboard themselves with World ID: their passport proves they're not from a sanctioned country. Sellers,
clients, and anyone World ID can't verify are approved by our admin, who can't move anyone's money.

Here's the builder. It uploads the signed agreement. The PDF stays offchain, but its SHA-256 hash goes
onchain, so nobody can swap the document later. It names the client's wallet and the amount, ten test
USDT standing in for a hundred million dollars, and a due date. That mints ten ERC-1155 units.

Now the client. It sees the agreement that names it, and verifies it from its own wallet. Only the
named client can do this, and it can't be undone.

The builder lists the units at a ten percent discount, ninety cents each, with a cap of six units per
investor.

An investor buys six units. In one transaction, five dollars forty of USDT goes to the builder and the
units go to the investor. Either both happen, or nothing moves. A second investor takes the last four,
and it's funded. The builder has its cash in minutes, with no bank and no collateral.

These units are restricted. They move between approved investors, but never to an outsider, the seller
or the client, never over the cap, and never after the due date. Every rule runs inside the contract's
transfer hook, and our tests cover every line.

Before the due date, the builder settles. One transaction pays one USDT per unit to whoever holds the
units right now. Here it is on the Whitechain explorer: ten USDT to two investors, in a single
transaction. A bank transfer can't move money and a restricted token together, or pay every holder at
once. USDT on Whitechain can.

How does Upfront make money? We take half a percent of what a seller raises, and only when a deal funds.
On that hundred-million-dollar contract, investors pay ninety million, we earn four hundred and fifty
thousand, and the builder gets the rest today. Investors pay nothing extra. At a hundred and fifty deals
a year, that's thirteen and a half million in revenue. We grow through the client: it verifies every
agreement, so one client brings all of its contractors. And the potential is huge. Data centres alone
need six point seven trillion dollars by 2030, and eight hundred billion of that goes to builders like
ours. Fund just one percent of it, and that's thirty-six million dollars for Upfront.

Upfront: big contracts shouldn't wait for big banks. It's live on Whitechain Sepolia today.
