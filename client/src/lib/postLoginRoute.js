// BETA.2.5 — centralised post-login/default-landing routing decision.
//
// Before this, the same "where should this user land" question was
// answered independently in FOUR places (App.jsx's RootRedirect,
// PublicRoute, LoginPage.jsx's submit handler, and — differently! —
// PrivateRoute's admin bypass), with divergent logic for the same input
// (e.g. an admin with no individual profile landed on /admin from `/`
// but was allowed to sit on /explore with no redirect at all when
// visiting it directly). Divergent, scattered redirect conditionals are
// exactly the pattern the reported "user3@gmail.com login hang" audit
// flagged as a risk — a user whose state falls into a gap between two
// slightly-different copies of this logic can end up in a route that
// itself redirects back, or that never renders anything.
//
// This does NOT special-case any specific account/email — it's a single,
// pure, total function: every possible `user` shape maps to exactly one
// route, including malformed/unexpected shapes (the `default` branch),
// so no caller of this function can produce an unhandled state.
export function resolvePostLoginRoute(user) {
  if (!user) return { route: '/login', reason: 'NOT_AUTHENTICATED' }
  if (user.adminRole) return { route: '/admin', reason: 'ADMIN' }
  if (!user.profile) return { route: '/create-profile', reason: 'PROFILE_MISSING' }
  return { route: '/explore', reason: 'PROFILE_ACTIVE' }
}
