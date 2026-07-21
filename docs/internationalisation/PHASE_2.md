# Internationalisation — Phase 2

This branch continues the work merged through PR #19.

## Scope

1. Localise backend-driven catalogues by stable slug:
   - intentions;
   - genders;
   - orientations;
   - boundaries and their categories;
   - profile type and subscription configuration where applicable.
2. Replace client dependencies on Portuguese backend messages with stable semantic codes.
3. Internationalise the administration area in PT-PT, English and French.
4. Add regression tests for catalogue fallback, admin navigation and fixed user-facing text.
5. Improve the global backend suite without hiding pre-existing failures.

## Completed

- Added PT-PT, English and French labels for the current intention, gender, orientation and boundary seed catalogues.
- Added translated boundary category labels.
- Updated profile creation and editing to render catalogue values by stable slug.
- Preserved API values, profile data and matching behaviour.
- Kept backend-provided names as fallback for future or custom catalogue entries.
- Added semantic error codes for account language and push subscription endpoints.
- Added semantic catalogue administration errors:
  - `CATALOG_VALIDATION_FAILED`;
  - `CATALOG_SLUG_ALREADY_EXISTS`;
  - `CATALOG_ITEM_NOT_FOUND`;
  - `CATALOG_ITEM_IN_USE`;
  - `BOUNDARY_CONSTRAINT_REQUIRED`;
  - `BOUNDARY_CONSTRAINT_NOT_ALLOWED`;
  - `PROFILE_TYPE_UNKNOWN`;
  - resource-specific load/create/update failure codes.
- Added scoped tests for catalogue validation, missing items, boundary constraints and structural profile types.

## Compatibility rule

The database remains the source of truth for catalogue entries. Translation keys use the stable `slug`; a missing translation always falls back to the name or label returned by the API.

## Validation gate

Each implementation block must pass:

- Prisma validation and client generation;
- backend typecheck;
- scoped tests related to the block;
- frontend production build;
- Playwright smoke tests;
- secret scanning.
