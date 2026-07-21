# Admin settings migration

This branch migrates the remaining legacy Configurações tab from `AdminPage.jsx` into localized, testable modules.

## Scope

- Preserve existing admin permissions, endpoints and payloads.
- Extract each settings manager independently.
- Localize PT-PT, EN and FR.
- Keep API enums and technical values stable.
- Replace the legacy settings fallback only after all managers are covered.

## Manager groups

1. Identity catalogs: profile types, roles, genders, orientations and intentions.
2. Discovery and safety: limits, private interests and locations.
3. Commercial: subscriptions, referral rule and email diagnostics.
4. Content and community: guide, events, circles and recommendations.
5. Runtime composition: settings navigation and router integration.
