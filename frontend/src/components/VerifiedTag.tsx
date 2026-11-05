/** Whether the buyer confirmed the receivable onchain. Shown beside the status everywhere. */
function VerifiedTag({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="tag ok">✓ Verified by buyer</span>
  ) : (
    <span className="tag warn">Not verified by buyer</span>
  )
}

export default VerifiedTag
