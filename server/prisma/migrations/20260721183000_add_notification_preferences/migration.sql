ALTER TABLE "users"
  ADD COLUMN "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "appIconBadgeEnabled" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "privacy_settings"
  ALTER COLUMN "showOnlineStatus" SET DEFAULT TRUE;
