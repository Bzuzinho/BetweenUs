// BETA.3 (live testing finding, B3/H2) — CoupleInvitePage/GroupInvitePage
// used to just `navigate('/login')` when the visitor wasn't authenticated
// yet, discarding the invite token entirely. For a brand-new partner
// clicking an invite link for the first time (the normal case — they
// don't have an account yet), this meant the link led nowhere useful:
// login/register, then... nothing, no way back to actually accept the
// invite. Same fix shape as RegisterPage.jsx's existing `betaCode`
// localStorage handoff — stash the invite path, consume it once auth
// completes (either via login or register), same pattern already proven
// in this codebase.
const KEY = 'pendingInviteRedirect'

export const setPendingInviteRedirect = (path) => {
  try { localStorage.setItem(KEY, path) } catch { /* ignore */ }
}

export const consumePendingInviteRedirect = () => {
  try {
    const v = localStorage.getItem(KEY)
    if (v) localStorage.removeItem(KEY)
    return v
  } catch {
    return null
  }
}
