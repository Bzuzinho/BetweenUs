CREATE TABLE IF NOT EXISTS "beta_applications" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "source" TEXT NOT NULL DEFAULT 'LANDING_PAGE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "beta_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "beta_applications_email_key"
  ON "beta_applications" (LOWER("email"));

CREATE INDEX IF NOT EXISTS "beta_applications_status_createdAt_idx"
  ON "beta_applications" ("status", "createdAt");
