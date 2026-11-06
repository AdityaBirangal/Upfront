#!/usr/bin/env bash
# Runs the full lifecycle with real USDT on Whitechain Sepolia, against the newest deployment.
#   scripts/demo-lifecycle.sh setup    create, verify, list, and invest, before the due date
#   scripts/demo-lifecycle.sh finish   waits for the due date, then settle, claim, and default
# Uses the upfront-* Foundry keystores. Transactions are saved to contracts/cache/lifecycle.log.
# DUE_SECONDS sets the time from setup to the due date. REHEARSE=1 impersonates on a local fork.
set -euo pipefail
cd "$(dirname "$0")/.."

RPC=${RPC:-https://rpc.testnet.whitechain.io/}
LOG=contracts/cache/lifecycle.log
STATE=contracts/cache/lifecycle.env
USDT=0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7
SELLER=0x8277639565AAE46ba7D3d8fA73A3fFC0b9c5BF50
BUYER=0xe58d750c4f22dD374476D73f0b9E6BEb34b1e4AD
INVESTOR1=0x48542534dF28c01768aCF552Effc30221e92b03f
INVESTOR2=0xbc5A7B66B53CBDa69AEb5516E4B58B8649815d2A
UP=$(node -e "
  const v = require('./deployments.json')['1874'].versions;
  console.log(v[Math.max(...Object.keys(v).map(Number))].upfront);
")
GRACE=$(cast call "$UP" 'gracePeriod()(uint64)' --rpc-url "$RPC")

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

wait_until() {
  local target=$1 left
  left=$(( target - $(now) ))
  (( left <= 0 )) && return 0
  if [[ -n ${REHEARSE:-} ]]; then
    cast rpc evm_increaseTime "$left" --rpc-url "$RPC" > /dev/null
    cast rpc evm_mine --rpc-url "$RPC" > /dev/null
    return 0
  fi
  while (( $(now) < target )); do
    echo "Waiting $(( target - $(now) ))s"
    sleep 15
  done
}

create() {
  local ref=$1
  local doc=0x$(printf 'upfront-%s-%s' "$ref" "$DUE" | shasum -a 256 | cut -d' ' -f1)
  send seller "$SELLER" "create-$ref" "$UP" \
    'createReceivable(address,uint256,uint64,bytes32,string)' "$BUYER" 10000000 "$DUE" "$doc" "$ref"
}

setup() {
  DUE=$(( $(now) + ${DUE_SECONDS:-900} ))
  : > "$LOG"
  create RCV-1001
  local paid
  paid=$(cast call "$UP" 'receivableCount()(uint256)' --rpc-url "$RPC")
  create RCV-1002
  local unpaid
  unpaid=$(cast call "$UP" 'receivableCount()(uint256)' --rpc-url "$RPC")
  printf 'DUE=%s\nPAID=%s\nUNPAID=%s\n' "$DUE" "$paid" "$unpaid" > "$STATE"

  send buyer "$BUYER" verify-RCV-1001 "$UP" 'verifyReceivable(uint256)' "$paid"
  send seller "$SELLER" list-RCV-1001 "$UP" 'listReceivable(uint256,uint16,uint256)' "$paid" 300 6
  send seller "$SELLER" list-RCV-1002 "$UP" 'listReceivable(uint256,uint16,uint256)' "$unpaid" 300 6
  send investor1 "$INVESTOR1" approve-investor1 "$USDT" 'approve(address,uint256)' "$UP" 5820000
  send investor1 "$INVESTOR1" invest-investor1-RCV-1001 "$UP" 'invest(uint256,uint256)' "$paid" 6
  send investor2 "$INVESTOR2" approve-investor2 "$USDT" 'approve(address,uint256)' "$UP" 4850000
  send investor2 "$INVESTOR2" invest-investor2-RCV-1001 "$UP" 'invest(uint256,uint256)' "$paid" 4
  send investor2 "$INVESTOR2" invest-investor2-RCV-1002 "$UP" 'invest(uint256,uint256)' "$unpaid" 1
  send buyer "$BUYER" approve-buyer "$USDT" 'approve(address,uint256)' "$UP" 10000000
  echo "Setup done. Due at $(date -r "$DUE" '+%H:%M:%S'). Next: scripts/demo-lifecycle.sh finish"
}

finish() {
  # shellcheck disable=SC1090
  source "$STATE"
  wait_until "$DUE"
  send buyer "$BUYER" settle-RCV-1001 "$UP" 'settle(uint256)' "$PAID"
  send investor1 "$INVESTOR1" claim-investor1 "$UP" 'claim(uint256)' "$PAID"
  send investor2 "$INVESTOR2" claim-investor2 "$UP" 'claim(uint256)' "$PAID"
  wait_until $(( DUE + GRACE + 1 ))
  send investor1 "$INVESTOR1" default-RCV-1002 "$UP" 'markDefault(uint256)' "$UNPAID"
  echo "Finished. Transactions are in $LOG"
}

case ${1:-} in
  setup) setup ;;
  finish) finish ;;
  *) echo "Usage: $0 setup|finish" >&2; exit 1 ;;
esac
