# World ID feedback

Notes from adding IDKit to Upfront at ETHGlobal Mumbai 2026. A wallet proves it belongs to a unique human
and then joins as an investor, once per human, using Proof of Human on a chain World doesn't support.

## Time to first success

**About 1 hour 20 minutes** from the first line of code to the first verified human joining onchain, with
the staging simulator. That covers the contract, backend, frontend, and tests. Once our contract was
deployed, the Developer Portal setup, app wiring, and first join took 33 minutes.

## What worked well

- `@worldcoin/idkit` installed cleanly in a React 19 and Vite app, and `IDKitRequestWidget` meant we
  wrote almost no verification UI.
- `signRequest` and `hashSignal` are small and do what they say, so the backend stayed short.
- The verify API gave a clear result on the first bad proof we sent it, which told us our `rp_id` was set
  up correctly before we tried a real flow.
- The simulator handled a V4 `proofOfHuman` request end to end, and let us test the same human on a
  second wallet.

## Friction

- **No verifier on our chain.** Whitechain isn't a supported chain, so we couldn't verify onchain. We
  verify on the backend, then sign our own voucher for the contract. That means one more key to protect
  and a trusted backend, which we'd rather avoid.
- **Keeping one human to one nullifier.** We couldn't confirm that a legacy proof or another credential
  gives the same nullifier as V4 Proof of Human, and if it doesn't, one human could join twice. A client
  controls its own request, so our backend checks `protocol_version` and `identifier` itself. The guides
  we read don't cover this.
- **Tying a proof to a wallet.** The verify API doesn't know which wallet we mean, and the result only
  carries `signal_hash`. We had to find `hashSignal` and compare the two ourselves, or a proof could have
  been reused for another wallet. This is easy to miss.

## What was missing from the docs

- **Nullifier format:** the integration guide says a 0x-prefixed hex string, but the SDK types say V4
  nullifiers are decimal. We convert with `BigInt`, which accepts both.
- **Repeat nullifiers:** the verify API reference doesn't say whether the API records them or rejects
  repeats, so we didn't rely on it and enforce this in our contract.
- **Cancellation:** the React page doesn't say how a user closing the widget is reported. We read the
  error codes from the types.
- **Simulator with presets:** we couldn't find whether `proofOfHuman` works with the simulator, and the
  React example uses `orbLegacy`, so we had to try it.
- **Developer Portal:** the guides don't describe the portal's screens or where to find `rp_id`.
- **URLs:** the prize page links `developer.worldcoin.org`, while the docs use `developer.world.org`.

## The one improvement with the greatest impact

**Have the verify API return a signed attestation** that any EVM contract can check, covering the
nullifier, signal, action, and credential. An app on any chain could then enforce World ID in its own
contract, without running a signer. It would remove our backend's signing key, the largest trust
assumption in this integration, and open World ID to every chain World hasn't deployed to.
