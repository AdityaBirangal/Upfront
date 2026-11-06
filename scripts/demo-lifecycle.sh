#!/usr/bin/env bash
# Runs the demo flow with real USDT on Whitechain Sepolia, against the newest deployment: create,
# verify, list, two investors buy, one resells units to the other, an outsider transfer is refused,
# and the seller settles in one click.
# Uses the upfront-* Foundry keystores. Transactions are saved to contracts/cache/lifecycle.log.
# DUE_SECONDS sets the time to the due date. REHEARSE=1 impersonates on a local fork.
set -euo pipefail
cd "$(dirname "$0")/.."

RPC=${RPC:-https://rpc.testnet.whitechain.io/}
LOG=contracts/cache/lifecycle.log
USDT=0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7
SELLER=0x8277639565AAE46ba7D3d8fA73A3fFC0b9c5BF50
BUYER=0xe58d750c4f22dD374476D73f0b9E6BEb34b1e4AD
INVESTOR1=0x48542534dF28c01768aCF552Effc30221e92b03f
INVESTOR2=0xbc5A7B66B53CBDa69AEb5516E4B58B8649815d2A
OUTSIDER=0x669406cE512732B8A32edde5566E17a8309E1DE1
UP=$(node -e "
  const v = require('./deployments.json')['1874'].versions;
  console.log(v[Math.max(...Object.keys(v).map(Number))].upfront);
")

# send <wallet name> <wallet address> <label> <cast send arguments...>
send() {
  local name=$1 from=$2 label=$3
  shift 3
  local signer=(--account "upfront-$name")
  if [[ -n ${REHEARSE:-} ]]; then signer=(--unlocked --from "$from"); fi
  echo "$label: password for upfront-$name"
  local receipt
  receipt=$(cast send "$@" "${signer[@]}" --rpc-url "$RPC" --json | tail -n 1)
  local result
  result=$(node -e "
    const r = JSON.parse(process.argv[1]);
    console.log(r.status === '0x1' ? r.transactionHash : 'FAILED ' + r.transactionHash);
  " "$receipt")
  echo "  $result"
  echo "$label $result" >> "$LOG"
  [[ $result != FAILED* ]]
}

now() { cast block latest -f timestamp --rpc-url "$RPC"; }

DUE=$(( $(now) + ${DUE_SECONDS:-86400} ))
REF=RCV-$DUE
DOC=0x$(printf 'upfront-%s' "$REF" | shasum -a 256 | cut -d' ' -f1)
: > "$LOG"

send seller "$SELLER" create "$UP" \
  'createReceivable(address,uint256,uint64,bytes32,string)' "$BUYER" 10000000 "$DUE" "$DOC" "$REF"
ID=$(cast call "$UP" 'receivableCount()(uint256)' --rpc-url "$RPC")
send buyer "$BUYER" verify "$UP" 'verifyReceivable(uint256)' "$ID"
send seller "$SELLER" list "$UP" 'listReceivable(uint256,uint16,uint256)' "$ID" 1000 6
send investor1 "$INVESTOR1" approve-investor1 "$USDT" 'approve(address,uint256)' "$UP" 5400000
send investor1 "$INVESTOR1" invest-investor1 "$UP" 'invest(uint256,uint256)' "$ID" 6
send investor2 "$INVESTOR2" approve-investor2 "$USDT" 'approve(address,uint256)' "$UP" 3600000
send investor2 "$INVESTOR2" invest-investor2 "$UP" 'invest(uint256,uint256)' "$ID" 4
TRANSFER='safeTransferFrom(address,address,uint256,uint256,bytes)'
echo "transfer to the outsider, simulated only: must be refused"
if cast call "$UP" "$TRANSFER" "$INVESTOR1" "$OUTSIDER" "$ID" 1 0x --from "$INVESTOR1" --rpc-url "$RPC" \
  > /dev/null 2>&1; then
  echo "  NOT REFUSED"
  exit 1
fi
echo "  refused"
send investor1 "$INVESTOR1" transfer-investor2 "$UP" "$TRANSFER" "$INVESTOR1" "$INVESTOR2" "$ID" 2 0x
send seller "$SELLER" approve-seller "$USDT" 'approve(address,uint256)' "$UP" 10000000
send seller "$SELLER" settle "$UP" 'settle(uint256)' "$ID"
echo "ID=$ID" >> "$LOG"
echo "Finished. Transactions are in $LOG"
