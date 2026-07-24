import * as Sentry from '@sentry/nextjs'

/**
 * Transactional email — STUB until Resend is wired up (see the pending
 * "Resend email" task).
 *
 * Deliberately built as a real call site now rather than a TODO comment: the
 * security-relevant decision is WHO gets told and WHEN, and that logic is
 * worth having reviewed, tested and in place before the transport exists.
 * When Resend lands, only sendTransactionalEmail() changes — no call site
 * moves.
 *
 * Until then every send is recorded rather than delivered, so a missing
 * notification is visible in logs and Sentry instead of silently absent.
 */

export type TransactionalEmail = {
  to: string
  subject: string
  body: string
}

const RESEND_CONFIGURED = Boolean(process.env.RESEND_API_KEY)

export async function sendTransactionalEmail(email: TransactionalEmail): Promise<void> {
  if (!RESEND_CONFIGURED) {
    // Not an error — expected until Resend ships. Recorded so an
    // undelivered security notice is traceable rather than invisible.
    console.warn(
      `[email:PENDING] would send to ${email.to} — "${email.subject}" (Resend not configured)`,
    )
    Sentry.captureMessage(`[email:PENDING] ${email.subject} -> ${email.to}`, 'info')
    return
  }

  // TODO(resend): replace with the Resend client. Keep the try/catch —
  // a failed notification must never break the action that triggered it.
  console.warn('[email] RESEND_API_KEY is set but the client is not implemented yet')
}

/**
 * Tell a member their account email was changed by an admin.
 *
 * Sent to the OLD address, and only secondarily to the new one. Notifying
 * only the new address would tell an attacker what they already know, while
 * the person who still owns the account — and who reads the old inbox — would
 * hear nothing. The old address is the one that can raise the alarm.
 *
 * Never throws: an account change must not fail because email is down.
 */
export async function notifyEmailChanged(opts: {
  oldEmail: string
  newEmail: string
  changedByAdmin: string
}): Promise<void> {
  const { oldEmail, newEmail, changedByAdmin } = opts

  const masked = newEmail.replace(/^(.).*(@.*)$/, '$1***$2')
  const body =
    `The email address on your WGY account was changed by an administrator ` +
    `(${changedByAdmin}).\n\n` +
    `It is now ${masked}.\n\n` +
    `If you did not expect this, contact support@wegotyouagency.com immediately — ` +
    `whoever controls the new address can request password resets for your account.`

  try {
    await sendTransactionalEmail({
      to: oldEmail,
      subject: 'Your WGY account email was changed',
      body,
    })
    // Secondary confirmation to the new address, so a legitimate change is
    // visible to the member wherever they are actually reading mail.
    await sendTransactionalEmail({
      to: newEmail,
      subject: 'Your WGY account email was changed',
      body,
    })
  } catch (err) {
    console.error('[email] notifyEmailChanged failed', err)
    Sentry.captureException(err, { tags: { subsystem: 'transactional-email' } })
  }
}
