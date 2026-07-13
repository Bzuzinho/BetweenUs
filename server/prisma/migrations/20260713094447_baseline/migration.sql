-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT_REVIEWER');

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('INDIVIDUAL', 'COUPLE', 'GROUP');

-- CreateEnum
CREATE TYPE "IndividualDiscoveryPolicy" AS ENUM ('INDIVIDUAL_AND_SHARED', 'SHARED_ONLY');

-- CreateEnum
CREATE TYPE "ProfileMemberStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'HIDDEN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('SINGLE', 'COMMITTED', 'MARRIED', 'OPEN', 'POLYAMOROUS', 'COUPLE_CURIOUS', 'COUPLE_LIBERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscretionLevel" AS ENUM ('MAXIMUM', 'SELECTIVE', 'OPEN');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'MATCHES_ONLY', 'INVISIBLE');

-- CreateEnum
CREATE TYPE "PhotoVisibility" AS ENUM ('PUBLIC', 'BLURRED', 'PRIVATE_AFTER_MATCH', 'PRIVATE_AFTER_APPROVAL');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "BoundaryPreference" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('LIKE', 'PASS', 'SUPER_LIKE', 'BLOCK', 'REPORT');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'PENDING_COUPLE_APPROVAL', 'ACTIVE', 'PAUSED', 'ENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CoupleStatus" AS ENUM ('PENDING_PARTNER', 'ACTIVE', 'PAUSED', 'SEPARATED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ApprovalPolicy" AS ENUM ('ALL', 'MAJORITY', 'DESIGNATED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM', 'CONSENT_REQUEST', 'PHOTO_UNLOCK_REQUEST', 'RULE_UPDATE', 'SAFETY');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('ONE_TO_ONE', 'COUPLE_GROUP', 'PRIVATE_ROOM');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE_PROFILE', 'HARASSMENT', 'OFFENSIVE_CONTENT', 'MINOR', 'NON_CONSENSUAL_IMAGE', 'SPAM', 'THREAT', 'COERCION', 'REVENGE_PORN', 'DOXXING', 'PROSTITUTION_OR_ESCORT', 'PAID_SEXUAL_SERVICES', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('MESSAGE_SNAPSHOT', 'PROFILE_SNAPSHOT', 'MEDIA_REFERENCE', 'ROOM_CONTEXT', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "SafetyCheckinStatus" AS ENUM ('SCHEDULED', 'WAITING_CONFIRMATION', 'SAFE_CONFIRMED', 'OVERDUE', 'ESCALATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PREMIUM', 'COUPLE_PREMIUM', 'ELITE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'UNPAID', 'TRIALING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('SELFIE', 'ID_DOCUMENT', 'VIDEO');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY_POLICY', 'SENSITIVE_DATA', 'MARKETING', 'LOCATION', 'CONTACT_HASHING');

-- CreateEnum
CREATE TYPE "NotificationMode" AS ENUM ('NORMAL', 'DISCREET', 'SILENT');

-- CreateEnum
CREATE TYPE "ConsentCheckStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConsentCheckPhase" AS ENUM ('MATCH', 'CHAT', 'PHOTO_REQUEST', 'FACE_REVEAL', 'VIDEO_CALL', 'MEETING_PROPOSAL', 'SAFETY_CHECKIN');

-- CreateEnum
CREATE TYPE "ConsentResponseStatus" AS ENUM ('PENDING', 'ACCEPTED', 'NOT_YET', 'DECLINED', 'REVOKED');

-- CreateEnum
CREATE TYPE "IntentAlignmentStatus" AS ENUM ('DRAFT', 'WAITING_APPROVAL', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PhotoAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaMemberScope" AS ENUM ('SINGLE_MEMBER', 'MULTIPLE_MEMBERS', 'SHARED_PROFILE');

-- CreateEnum
CREATE TYPE "BoundaryRuleType" AS ENUM ('MUTUAL_ALIGNMENT', 'REQUIRE_TARGET_ACCEPTANCE', 'PERSONAL_PREFERENCE', 'CANDIDATE_CONSTRAINT');

-- CreateEnum
CREATE TYPE "BoundaryConstraintType" AS ENUM ('EXCLUDE_COUPLES', 'COUPLES_ONLY', 'INDIVIDUALS_ONLY', 'VERIFIED_ONLY');

-- CreateEnum
CREATE TYPE "ProfileAgreementStatus" AS ENUM ('DRAFT', 'WAITING_MEMBERS', 'ALIGNED', 'CONFLICT', 'LOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SharedProfilePolicyProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrivateRoomType" AS ENUM ('INDIVIDUAL_PAIR', 'COUPLE_SINGLE', 'COUPLE_COUPLE', 'POLY_GROUP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PrivateRoomStatus" AS ENUM ('DRAFT', 'WAITING_CONSENT', 'ACTIVE', 'PAUSED', 'CLOSED', 'SAFETY_LOCKED');

-- CreateEnum
CREATE TYPE "RoomMemberRole" AS ENUM ('OWNER', 'MEMBER', 'MODERATOR_SYSTEM');

-- CreateEnum
CREATE TYPE "RoomMemberStatus" AS ENUM ('INVITED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "MessageTtlPreset" AS ENUM ('NONE', 'ONE_HOUR', 'ONE_DAY', 'SEVEN_DAYS');

-- CreateEnum
CREATE TYPE "RoomRuleSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "TravelModeStatus" AS ENUM ('WAITING_MEMBER_APPROVAL', 'SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuideCategory" AS ENUM ('CONSENT', 'COUPLES', 'OPEN_RELATIONSHIPS', 'POLYAMORY', 'PRIVACY', 'SAFETY', 'PROFILES', 'FIRST_MEETINGS', 'PRIVATE_INTERESTS');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VenueVisibility" AS ENUM ('PUBLIC_CITY_ONLY', 'APPROVED_ATTENDEES', 'REVEAL_24H_BEFORE');

-- CreateEnum
CREATE TYPE "EventAttendanceStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DECLINED', 'CANCELLED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "CircleVisibility" AS ENUM ('DISCOVERABLE', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "CircleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CircleMembershipStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DECLINED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "CircleMemberRole" AS ENUM ('MEMBER', 'LOCAL_MODERATOR');

-- CreateEnum
CREATE TYPE "RecommendationSignalType" AS ENUM ('PROFILE_VIEW', 'LIKE', 'MAYBE', 'PASS', 'MATCH', 'CONVERSATION_STARTED', 'SUSTAINED_CONVERSATION', 'PHOTO_ACCESS_GRANTED', 'SAFE_EXIT', 'BLOCK', 'REPORT');

-- CreateEnum
CREATE TYPE "TestSeedRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "ageVerifiedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyAcceptedAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "adminRole" "AdminRole",
    "lastSeenAt" TIMESTAMP(3),
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "nif" TEXT,
    "accountName" TEXT,
    "avatarPath" TEXT,
    "isTestAccount" BOOLEAN NOT NULL DEFAULT false,
    "testScenarioKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activeProfileId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_type_configs" (
    "type" "ProfileType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_type_configs_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "ProfileType" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "ProfileStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "gender" TEXT,
    "orientation" TEXT,
    "relationshipStatus" "RelationshipStatus" NOT NULL DEFAULT 'SINGLE',
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "city" TEXT,
    "country" TEXT,
    "visibilityMode" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "discretionLevel" "DiscretionLevel" NOT NULL DEFAULT 'SELECTIVE',
    "betweenScore" INTEGER,
    "rejectionReason" TEXT,
    "moderationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sharedDescription" TEXT,
    "individualDiscoveryPolicy" "IndividualDiscoveryPolicy" NOT NULL DEFAULT 'SHARED_ONLY',
    "approvalPolicy" "ApprovalPolicy" NOT NULL DEFAULT 'ALL',

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_profiles" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "partnerOneUserId" TEXT NOT NULL,
    "partnerTwoUserId" TEXT,
    "partnerTwoInviteEmail" TEXT,
    "partnerTwoAcceptedAt" TIMESTAMP(3),
    "coupleStatus" "CoupleStatus" NOT NULL DEFAULT 'PENDING_PARTNER',
    "coupleInviteToken" TEXT,
    "coupleDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couple_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_members" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT,
    "invitedEmail" TEXT,
    "isCreator" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProfileMemberStatus" NOT NULL DEFAULT 'PENDING',
    "inviteToken" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "profile_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_photos" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "blurredPath" TEXT,
    "visibilityLevel" "PhotoVisibility" NOT NULL DEFAULT 'BLURRED',
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNotes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "exifStripped" BOOLEAN NOT NULL DEFAULT false,
    "memberScope" "MediaMemberScope" NOT NULL DEFAULT 'SINGLE_MEMBER',
    "depictedMemberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intentions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "complementarySlug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "intentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_intentions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "intentionId" TEXT NOT NULL,
    "preference" "BoundaryPreference" NOT NULL DEFAULT 'YES',

    CONSTRAINT "profile_intentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boundaries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isHardBoundary" BOOLEAN NOT NULL DEFAULT false,
    "ruleType" "BoundaryRuleType" NOT NULL DEFAULT 'MUTUAL_ALIGNMENT',
    "constraintType" "BoundaryConstraintType",
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_boundaries" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "boundaryId" TEXT NOT NULL,
    "preference" "BoundaryPreference" NOT NULL,

    CONSTRAINT "profile_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_agreements" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProfileAgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_agreement_answers" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "profileMemberId" TEXT NOT NULL,
    "boundaryId" TEXT,
    "agreementQuestionId" TEXT,
    "preference" "BoundaryPreference" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_agreement_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_questions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreement_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_interests" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "private_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_private_interests" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "preference" "BoundaryPreference" NOT NULL,

    CONSTRAINT "profile_private_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_settings" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "visibleInDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "showDistance" BOOLEAN NOT NULL DEFAULT true,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT false,
    "allowPhotoRequests" BOOLEAN NOT NULL DEFAULT true,
    "invisibleMode" BOOLEAN NOT NULL DEFAULT false,
    "notificationMode" "NotificationMode" NOT NULL DEFAULT 'DISCREET',
    "minDistanceKm" INTEGER,
    "showCircleBadge" BOOLEAN NOT NULL DEFAULT false,
    "hideCircleMemberships" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_actions" (
    "id" TEXT NOT NULL,
    "actorProfileId" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "action" "ActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "profileOneId" TEXT NOT NULL,
    "profileTwoId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "matchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_match_approvals" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_match_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_profile_policy_proposals" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "proposedPolicy" "IndividualDiscoveryPolicy" NOT NULL,
    "proposedByUserId" TEXT NOT NULL,
    "status" "SharedProfilePolicyProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_profile_policy_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_profile_policy_approvals" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_profile_policy_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'ONE_TO_ONE',
    "agreedRules" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "expiresAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "removedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_rooms" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "title" TEXT,
    "roomType" "PrivateRoomType" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "rules" TEXT[],
    "status" "PrivateRoomStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultMessageTtl" "MessageTtlPreset" NOT NULL DEFAULT 'NONE',
    "closedAt" TIMESTAMP(3),
    "safetyLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "mediaId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "room_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_room_members" (
    "id" TEXT NOT NULL,
    "privateRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "RoomMemberStatus" NOT NULL DEFAULT 'ACCEPTED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "private_room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_rule_sets" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "RoomRuleSetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "room_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_rules" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "room_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_rule_approvals" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_rule_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_checks" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "phase" "ConsentCheckPhase" NOT NULL,
    "status" "ConsentCheckStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_check_responses" (
    "id" TEXT NOT NULL,
    "consentCheckId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ConsentResponseStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_check_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_alignments" (
    "id" TEXT NOT NULL,
    "privateRoomId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "IntentAlignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "intent_alignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_alignment_items" (
    "id" TEXT NOT NULL,
    "alignmentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "intent_alignment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_alignment_approvals" (
    "id" TEXT NOT NULL,
    "alignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_alignment_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_checkins" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "matchId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "safetyEmail" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "locationHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SafetyCheckinStatus" NOT NULL DEFAULT 'SCHEDULED',
    "requestSentAt" TIMESTAMP(3),
    "overdueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),

    CONSTRAINT "safety_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "reportedMessageId" TEXT,
    "reportedEventId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_evidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_assessments" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerEventId" TEXT NOT NULL,
    "providerInvoiceId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentRecordStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL DEFAULT 'SELFIE',
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "selfieStoragePath" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiresReacceptance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_contact_hashes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_contact_hashes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_modes" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "TravelModeStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_mode_approvals" (
    "id" TEXT NOT NULL,
    "travelModeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_mode_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibility_scores" (
    "id" TEXT NOT NULL,
    "sourceProfileId" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "breakdown" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "compatibility_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "between_score_configs" (
    "id" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "weightIntentions" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "weightBoundaries" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "weightRelationshipContext" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "weightDiscretion" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "weightLocation" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "weightConversationPace" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "between_score_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "internalNote" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "usedById" TEXT,
    "email" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "beta_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_access_requests" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "PhotoAccessStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_access_approvals" (
    "id" TEXT NOT NULL,
    "photoAccessRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_access_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_conversions" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3),
    "creditGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_rules" (
    "id" TEXT NOT NULL,
    "referralsRequired" INTEGER NOT NULL DEFAULT 2,
    "rewardMonths" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "referral_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gender_options" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "localeKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gender_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orientation_options" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "localeKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orientation_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "GuideCategory" NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "icon" TEXT DEFAULT 'Ôùï',
    "coverPath" TEXT,
    "authorId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "readingTime" INTEGER,
    "locale" TEXT NOT NULL DEFAULT 'pt',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "venueDetail" TEXT,
    "venueVisibility" "VenueVisibility" NOT NULL DEFAULT 'PUBLIC_CITY_ONLY',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "verificationRequired" BOOLEAN NOT NULL DEFAULT true,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendances" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "EventAttendanceStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "event_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "country" TEXT,
    "visibility" "CircleVisibility" NOT NULL DEFAULT 'DISCOVERABLE',
    "status" "CircleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_memberships" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "CircleMembershipStatus" NOT NULL DEFAULT 'REQUESTED',
    "role" "CircleMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_signals" (
    "id" TEXT NOT NULL,
    "actorProfileId" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "signalType" "RecommendationSignalType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_signal_weight_configs" (
    "id" TEXT NOT NULL,
    "configVersion" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "weightProfileView" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "weightLike" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weightMaybe" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "weightPass" DOUBLE PRECISION NOT NULL DEFAULT -1,
    "weightMatch" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "weightConversationStarted" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "weightSustainedConversation" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "weightPhotoAccessGranted" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "weightSafeExit" DOUBLE PRECISION NOT NULL DEFAULT -8,
    "weightBlock" DOUBLE PRECISION NOT NULL DEFAULT -10,
    "weightReport" DOUBLE PRECISION NOT NULL DEFAULT -15,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_signal_weight_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_ranking_logs" (
    "id" TEXT NOT NULL,
    "viewerProfileId" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "currentRank" INTEGER NOT NULL,
    "recommendationRank" INTEGER NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL,
    "recommendationScore" DOUBLE PRECISION NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "reasonCodes" TEXT[],
    "isExploration" BOOLEAN NOT NULL DEFAULT false,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_ranking_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_seed_runs" (
    "id" TEXT NOT NULL,
    "seedName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "TestSeedRunStatus" NOT NULL DEFAULT 'RUNNING',
    "recordCounts" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_seed_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_isTestAccount_idx" ON "users"("isTestAccount");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "profiles_status_type_idx" ON "profiles"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "couple_profiles_profileId_key" ON "couple_profiles"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "couple_profiles_coupleInviteToken_key" ON "couple_profiles"("coupleInviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "profile_members_inviteToken_key" ON "profile_members"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "profile_members_profileId_userId_key" ON "profile_members"("profileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_userId_key" ON "onboarding_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "intentions_slug_key" ON "intentions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "profile_intentions_profileId_intentionId_key" ON "profile_intentions"("profileId", "intentionId");

-- CreateIndex
CREATE UNIQUE INDEX "boundaries_slug_key" ON "boundaries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "profile_boundaries_profileId_boundaryId_key" ON "profile_boundaries"("profileId", "boundaryId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_agreements_profileId_version_key" ON "profile_agreements"("profileId", "version");

-- CreateIndex
CREATE INDEX "profile_agreement_answers_agreementId_profileMemberId_idx" ON "profile_agreement_answers"("agreementId", "profileMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_questions_slug_key" ON "agreement_questions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "private_interests_slug_key" ON "private_interests"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "profile_private_interests_profileId_interestId_key" ON "profile_private_interests"("profileId", "interestId");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_settings_profileId_key" ON "privacy_settings"("profileId");

-- CreateIndex
CREATE INDEX "profile_actions_targetProfileId_action_idx" ON "profile_actions"("targetProfileId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "profile_actions_actorProfileId_targetProfileId_key" ON "profile_actions"("actorProfileId", "targetProfileId");

-- CreateIndex
CREATE INDEX "matches_profileTwoId_idx" ON "matches"("profileTwoId");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "matches_profileOneId_profileTwoId_key" ON "matches"("profileOneId", "profileTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "couple_match_approvals_matchId_userId_key" ON "couple_match_approvals"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_profile_policy_approvals_proposalId_userId_key" ON "shared_profile_policy_approvals"("proposalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_matchId_key" ON "conversations"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "private_rooms_matchId_key" ON "private_rooms"("matchId");

-- CreateIndex
CREATE INDEX "room_messages_roomId_createdAt_idx" ON "room_messages"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "private_room_members_privateRoomId_userId_key" ON "private_room_members"("privateRoomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_rule_sets_roomId_version_key" ON "room_rule_sets"("roomId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "room_rule_approvals_ruleSetId_userId_key" ON "room_rule_approvals"("ruleSetId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "consent_check_responses_consentCheckId_userId_key" ON "consent_check_responses"("consentCheckId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "intent_alignment_items_alignmentId_key_key" ON "intent_alignment_items"("alignmentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "intent_alignment_approvals_alignmentId_userId_key" ON "intent_alignment_approvals"("alignmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_providerEventId_key" ON "payment_records"("providerEventId");

-- CreateIndex
CREATE INDEX "payment_records_userId_idx" ON "payment_records"("userId");

-- CreateIndex
CREATE INDEX "payment_records_subscriptionId_idx" ON "payment_records"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_userId_key" ON "verifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_consentType_version_key" ON "legal_documents"("consentType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_contact_hashes_userId_contactHash_key" ON "blocked_contact_hashes"("userId", "contactHash");

-- CreateIndex
CREATE INDEX "travel_modes_profileId_active_idx" ON "travel_modes"("profileId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "travel_mode_approvals_travelModeId_userId_key" ON "travel_mode_approvals"("travelModeId", "userId");

-- CreateIndex
CREATE INDEX "compatibility_scores_targetProfileId_idx" ON "compatibility_scores"("targetProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "compatibility_scores_sourceProfileId_targetProfileId_algori_key" ON "compatibility_scores"("sourceProfileId", "targetProfileId", "algorithmVersion");

-- CreateIndex
CREATE UNIQUE INDEX "between_score_configs_algorithmVersion_key" ON "between_score_configs"("algorithmVersion");

-- CreateIndex
CREATE UNIQUE INDEX "beta_invites_code_key" ON "beta_invites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "beta_invites_usedById_key" ON "beta_invites"("usedById");

-- CreateIndex
CREATE UNIQUE INDEX "photo_access_requests_photoId_requesterId_key" ON "photo_access_requests"("photoId", "requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "photo_access_approvals_photoAccessRequestId_userId_key" ON "photo_access_approvals"("photoAccessRequestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_userId_key" ON "referral_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_conversions_referredUserId_key" ON "referral_conversions"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "gender_options_slug_key" ON "gender_options"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "orientation_options_slug_key" ON "orientation_options"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "guide_articles_slug_key" ON "guide_articles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_city_idx" ON "events"("city");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendances_eventId_profileId_key" ON "event_attendances"("eventId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "circles_slug_key" ON "circles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "circle_memberships_circleId_profileId_key" ON "circle_memberships"("circleId", "profileId");

-- CreateIndex
CREATE INDEX "recommendation_signals_actorProfileId_targetProfileId_idx" ON "recommendation_signals"("actorProfileId", "targetProfileId");

-- CreateIndex
CREATE INDEX "recommendation_signals_targetProfileId_signalType_idx" ON "recommendation_signals"("targetProfileId", "signalType");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_signal_weight_configs_configVersion_key" ON "recommendation_signal_weight_configs"("configVersion");

-- CreateIndex
CREATE INDEX "recommendation_ranking_logs_viewerProfileId_createdAt_idx" ON "recommendation_ranking_logs"("viewerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "recommendation_ranking_logs_algorithmVersion_createdAt_idx" ON "recommendation_ranking_logs"("algorithmVersion", "createdAt");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_profiles" ADD CONSTRAINT "couple_profiles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_members" ADD CONSTRAINT "profile_members_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_members" ADD CONSTRAINT "profile_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_intentions" ADD CONSTRAINT "profile_intentions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_intentions" ADD CONSTRAINT "profile_intentions_intentionId_fkey" FOREIGN KEY ("intentionId") REFERENCES "intentions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_boundaries" ADD CONSTRAINT "profile_boundaries_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_boundaries" ADD CONSTRAINT "profile_boundaries_boundaryId_fkey" FOREIGN KEY ("boundaryId") REFERENCES "boundaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_agreements" ADD CONSTRAINT "profile_agreements_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_agreement_answers" ADD CONSTRAINT "profile_agreement_answers_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "profile_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_agreement_answers" ADD CONSTRAINT "profile_agreement_answers_profileMemberId_fkey" FOREIGN KEY ("profileMemberId") REFERENCES "profile_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_agreement_answers" ADD CONSTRAINT "profile_agreement_answers_boundaryId_fkey" FOREIGN KEY ("boundaryId") REFERENCES "boundaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_agreement_answers" ADD CONSTRAINT "profile_agreement_answers_agreementQuestionId_fkey" FOREIGN KEY ("agreementQuestionId") REFERENCES "agreement_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_private_interests" ADD CONSTRAINT "profile_private_interests_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_private_interests" ADD CONSTRAINT "profile_private_interests_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "private_interests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_actions" ADD CONSTRAINT "profile_actions_actorProfileId_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_actions" ADD CONSTRAINT "profile_actions_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_profileOneId_fkey" FOREIGN KEY ("profileOneId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_profileTwoId_fkey" FOREIGN KEY ("profileTwoId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_match_approvals" ADD CONSTRAINT "couple_match_approvals_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_match_approvals" ADD CONSTRAINT "couple_match_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_profile_policy_proposals" ADD CONSTRAINT "shared_profile_policy_proposals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_profile_policy_approvals" ADD CONSTRAINT "shared_profile_policy_approvals_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "shared_profile_policy_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_profile_policy_approvals" ADD CONSTRAINT "shared_profile_policy_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_rooms" ADD CONSTRAINT "private_rooms_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "private_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_room_members" ADD CONSTRAINT "private_room_members_privateRoomId_fkey" FOREIGN KEY ("privateRoomId") REFERENCES "private_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_room_members" ADD CONSTRAINT "private_room_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rule_sets" ADD CONSTRAINT "room_rule_sets_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "private_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rules" ADD CONSTRAINT "room_rules_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "room_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rule_approvals" ADD CONSTRAINT "room_rule_approvals_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "room_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_rule_approvals" ADD CONSTRAINT "room_rule_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_checks" ADD CONSTRAINT "consent_checks_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_check_responses" ADD CONSTRAINT "consent_check_responses_consentCheckId_fkey" FOREIGN KEY ("consentCheckId") REFERENCES "consent_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_check_responses" ADD CONSTRAINT "consent_check_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_alignments" ADD CONSTRAINT "intent_alignments_privateRoomId_fkey" FOREIGN KEY ("privateRoomId") REFERENCES "private_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_alignment_items" ADD CONSTRAINT "intent_alignment_items_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "intent_alignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_alignment_approvals" ADD CONSTRAINT "intent_alignment_approvals_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "intent_alignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_alignment_approvals" ADD CONSTRAINT "intent_alignment_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_checkins" ADD CONSTRAINT "safety_checkins_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_assessments" ADD CONSTRAINT "moderation_assessments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_contact_hashes" ADD CONSTRAINT "blocked_contact_hashes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_modes" ADD CONSTRAINT "travel_modes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_mode_approvals" ADD CONSTRAINT "travel_mode_approvals_travelModeId_fkey" FOREIGN KEY ("travelModeId") REFERENCES "travel_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_mode_approvals" ADD CONSTRAINT "travel_mode_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_scores" ADD CONSTRAINT "compatibility_scores_sourceProfileId_fkey" FOREIGN KEY ("sourceProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_scores" ADD CONSTRAINT "compatibility_scores_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_requests" ADD CONSTRAINT "photo_access_requests_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "profile_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_approvals" ADD CONSTRAINT "photo_access_approvals_photoAccessRequestId_fkey" FOREIGN KEY ("photoAccessRequestId") REFERENCES "photo_access_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_approvals" ADD CONSTRAINT "photo_access_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_articles" ADD CONSTRAINT "guide_articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerProfileId_fkey" FOREIGN KEY ("organizerProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circles" ADD CONSTRAINT "circles_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_memberships" ADD CONSTRAINT "circle_memberships_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_memberships" ADD CONSTRAINT "circle_memberships_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

