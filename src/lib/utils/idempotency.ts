/**
 * One idempotency key per form session: generated when the form opens and
 * reused across retries of the same submission, so a double-click or a
 * retried timeout can never place two bets.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}
