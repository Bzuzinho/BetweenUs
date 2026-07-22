-- Editable metadata and effective permissions for the fixed AdminRole enum.
CREATE TABLE "admin_role_configs" (
  "role" "AdminRole" NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT[] NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_role_configs_pkey" PRIMARY KEY ("role")
);

INSERT INTO "admin_role_configs" ("role", "label", "description", "permissions") VALUES
  ('CONTENT_REVIEWER','Revisor de conteúdo','Revisão de fotografias, perfis e conteúdos.',ARRAY['photos','profiles','guide']),
  ('SUPPORT','Suporte','Apoio a utilizadores e tratamento inicial de denúncias.',ARRAY['users','reports']),
  ('MODERATOR','Moderador','Moderação de perfis, fotografias, denúncias e conversas.',ARRAY['profiles','photos','reports','conversations','moderation.evidence.view','events']),
  ('FINANCE','Financeiro','Subscrições e métricas financeiras.',ARRAY['subscriptions','metrics']),
  ('ADMIN','Administrador','Administração operacional, sem gestão de roles.',ARRAY['users','profiles','photos','reports','subscriptions','metrics','audit','beta','conversations','guide','catalog','legal','moderation.evidence.view','events','circle.manage','recommendations']),
  ('SUPER_ADMIN','Super Admin','Acesso total, incluindo roles e configurações.',ARRAY['*']);

-- Merge legacy translated intention rows into the canonical slug rows.
WITH aliases(alias, canonical_slug) AS (VALUES
  ('casual encounter','casual_encounter'),('encontro casual','casual_encounter'),
  ('recurring connection','recurring_connection'),('ligação recorrente','recurring_connection'),
  ('threesome experience','trio_experience'),('experiência a três','trio_experience'),
  ('swinging','swing'),('swing','swing'),('polyamory','polyamory'),('poliamor','polyamory'),
  ('online only','online_only'),('apenas online','online_only'),
  ('friends with benefits','friends_with_benefits'),('amizade colorida','friends_with_benefits'),
  ('explore fetishes','fetish_exploration'),('explorar fetiches','fetish_exploration'),
  ('meet a couple','seek_couple'),('procurar casal','seek_couple'),
  ('meet a third person','seek_third'),('procurar terceira pessoa','seek_third'),
  ('conversation only','conversation_only'),('apenas conversa','conversation_only'),
  ('open relationship','open_relationship'),('relação aberta','open_relationship'),
  ('still exploring','still_exploring'),('ainda a descobrir','still_exploring')
), duplicates AS (
  SELECT d.id duplicate_id, c.id canonical_id
  FROM intentions d JOIN aliases a ON lower(trim(d.name))=a.alias
  JOIN intentions c ON c.slug=a.canonical_slug
  WHERE d.id<>c.id
)
INSERT INTO profile_intentions (id, "profileId", "intentionId", preference)
SELECT md5(random()::text || clock_timestamp()::text || pi.id)::uuid, pi."profileId", d.canonical_id, pi.preference
FROM profile_intentions pi JOIN duplicates d ON d.duplicate_id=pi."intentionId"
ON CONFLICT ("profileId", "intentionId") DO NOTHING;

WITH aliases(alias, canonical_slug) AS (VALUES
  ('casual encounter','casual_encounter'),('encontro casual','casual_encounter'),('recurring connection','recurring_connection'),('ligação recorrente','recurring_connection'),
  ('threesome experience','trio_experience'),('experiência a três','trio_experience'),('swinging','swing'),('swing','swing'),('polyamory','polyamory'),('poliamor','polyamory'),
  ('online only','online_only'),('apenas online','online_only'),('friends with benefits','friends_with_benefits'),('amizade colorida','friends_with_benefits'),
  ('explore fetishes','fetish_exploration'),('explorar fetiches','fetish_exploration'),('meet a couple','seek_couple'),('procurar casal','seek_couple'),
  ('meet a third person','seek_third'),('procurar terceira pessoa','seek_third'),('conversation only','conversation_only'),('apenas conversa','conversation_only'),
  ('open relationship','open_relationship'),('relação aberta','open_relationship'),('still exploring','still_exploring'),('ainda a descobrir','still_exploring')
), duplicates AS (SELECT d.id duplicate_id FROM intentions d JOIN aliases a ON lower(trim(d.name))=a.alias JOIN intentions c ON c.slug=a.canonical_slug WHERE d.id<>c.id)
DELETE FROM profile_intentions WHERE "intentionId" IN (SELECT duplicate_id FROM duplicates);

WITH aliases(alias, canonical_slug) AS (VALUES
  ('casual encounter','casual_encounter'),('encontro casual','casual_encounter'),('recurring connection','recurring_connection'),('ligação recorrente','recurring_connection'),
  ('threesome experience','trio_experience'),('experiência a três','trio_experience'),('swinging','swing'),('swing','swing'),('polyamory','polyamory'),('poliamor','polyamory'),
  ('online only','online_only'),('apenas online','online_only'),('friends with benefits','friends_with_benefits'),('amizade colorida','friends_with_benefits'),
  ('explore fetishes','fetish_exploration'),('explorar fetiches','fetish_exploration'),('meet a couple','seek_couple'),('procurar casal','seek_couple'),
  ('meet a third person','seek_third'),('procurar terceira pessoa','seek_third'),('conversation only','conversation_only'),('apenas conversa','conversation_only'),
  ('open relationship','open_relationship'),('relação aberta','open_relationship'),('still exploring','still_exploring'),('ainda a descobrir','still_exploring')
)
DELETE FROM intentions d USING aliases a, intentions c WHERE lower(trim(d.name))=a.alias AND c.slug=a.canonical_slug AND d.id<>c.id;

-- Merge translated boundary rows into the canonical slug rows too.
CREATE TEMP TABLE boundary_aliases(alias TEXT, canonical_slug TEXT) ON COMMIT DROP;
INSERT INTO boundary_aliases VALUES
 ('no emotional involvement','no_emotional_involvement'),('sem envolvimento emocional','no_emotional_involvement'),
 ('open to emotional involvement','open_to_emotional'),('aberto a envolvimento emocional','open_to_emotional'),
 ('recurring emotional connection','recurring_emotional_connection'),('envolvimento emocional recorrente','recurring_emotional_connection'),
 ('no couples','no_couples'),('não quero casais','no_couples'),('couples only','couples_only'),('apenas casais','couples_only'),
 ('single people only','singles_only'),('apenas solteiros','singles_only'),('online only','online_only'),('apenas online','online_only'),
 ('open to meeting in person','open_to_meeting'),('aberto a encontro presencial','open_to_meeting'),
 ('one time only','one_time_only'),('apenas uma vez','one_time_only'),('open to recurring encounters','recurring_ok'),('aberto a encontros recorrentes','recurring_ok'),
 ('meet only after talking','meet_after_conversation'),('só encontro depois de conversar','meet_after_conversation'),
 ('spontaneous meeting','spontaneous_meeting'),('encontro espontâneo','spontaneous_meeting'),
 ('no face photos','no_face_photos'),('sem fotos de rosto','no_face_photos'),
 ('face visible before matching','face_visible_before_match'),('rosto visível antes do match','face_visible_before_match'),
 ('face visible after matching','face_visible_after_match'),('rosto visível depois do match','face_visible_after_match'),
 ('allow private gallery requests','private_gallery_requests'),('aceito pedidos de galeria privada','private_gallery_requests'),
 ('no people i know','no_known_contacts'),('sem pessoas conhecidas','no_known_contacts'),
 ('verified profiles only','verified_only'),('apenas perfis verificados','verified_only'),
 ('discretion required','discretion_required'),('discrição obrigatória','discretion_required'),
 ('talk first','talk_first'),('conversar primeiro','talk_first'),
 ('talk online before arranging a meeting','talk_online_first'),('falar online antes de marcar','talk_online_first'),
 ('direct approach','direct_approach'),('abordagem direta','direct_approach'),('abordagem directa','direct_approach'),
 ('slow pace','slow_pace'),('ritmo lento','slow_pace'),('fast pace','fast_pace'),('ritmo rápido','fast_pace');

WITH duplicates AS (
  SELECT d.id duplicate_id, c.id canonical_id
  FROM boundaries d JOIN boundary_aliases a ON lower(trim(d.name))=a.alias
  JOIN boundaries c ON c.slug=a.canonical_slug WHERE d.id<>c.id
)
INSERT INTO profile_boundaries (id, "profileId", "boundaryId", preference)
SELECT md5(random()::text || clock_timestamp()::text || pb.id)::uuid, pb."profileId", d.canonical_id, pb.preference
FROM profile_boundaries pb JOIN duplicates d ON d.duplicate_id=pb."boundaryId"
ON CONFLICT ("profileId", "boundaryId") DO NOTHING;

WITH duplicates AS (
  SELECT d.id duplicate_id, c.id canonical_id
  FROM boundaries d JOIN boundary_aliases a ON lower(trim(d.name))=a.alias
  JOIN boundaries c ON c.slug=a.canonical_slug WHERE d.id<>c.id
)
UPDATE profile_agreement_answers paa SET "boundaryId"=d.canonical_id
FROM duplicates d WHERE paa."boundaryId"=d.duplicate_id;

WITH duplicates AS (
  SELECT d.id duplicate_id FROM boundaries d JOIN boundary_aliases a ON lower(trim(d.name))=a.alias
  JOIN boundaries c ON c.slug=a.canonical_slug WHERE d.id<>c.id
)
DELETE FROM profile_boundaries WHERE "boundaryId" IN (SELECT duplicate_id FROM duplicates);

DELETE FROM boundaries d USING boundary_aliases a, boundaries c
WHERE lower(trim(d.name))=a.alias AND c.slug=a.canonical_slug AND d.id<>c.id;
