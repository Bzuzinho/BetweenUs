// BETA.1.8 — central manifest of every account the beta seed creates.
// This is intentionally the ONLY place account-level scenario data lives
// — phase modules (accounts.ts, profiles.ts, discovery.ts, ...) read from
// here, they never hardcode an email or scenario fact inline. Every
// account has a scenarioKey (stored on User.testScenarioKey), an email in
// the reserved betweenus.test namespace (BETA_SEED_EMAIL_DOMAIN), and an
// `expected` list of human-readable test cases validateBetaSeed.ts checks
// against.
import { BETA_SEED_EMAIL_DOMAIN } from './guards'

export const email = (localPart: string): string => `${localPart}@${BETA_SEED_EMAIL_DOMAIN}`

export type AdminRoleValue = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | 'FINANCE' | 'CONTENT_REVIEWER'

export interface AdminAccountScenario {
  key: string
  email: string
  accountName: string
  adminRole: AdminRoleValue
  scenario: string
  expected: string[]
}

// BETA.1.9 — 6 admin accounts, one per AdminRole, matching
// middleware/admin.ts's ROLE_PERMISSIONS exactly (confirmed against the
// current source, not assumed).
export const ADMIN_ACCOUNTS: AdminAccountScenario[] = [
  { key: 'admin_super', email: email('beta.admin.super'), accountName: 'Beta Super Admin', adminRole: 'SUPER_ADMIN',
    scenario: 'Acesso completo — todas as permissões (\'*\')',
    expected: ['Acede a todas as secções admin', 'Único role que pode ver includeTestData nas métricas', 'Único role que pode correr hard-delete/cleanup em produção'] },
  { key: 'admin_admin', email: email('beta.admin.admin'), accountName: 'Beta Admin', adminRole: 'ADMIN',
    scenario: 'Acesso amplo, sem acções SUPER_ADMIN-only',
    expected: ['Vê users/profiles/photos/reports/subscriptions/metrics/audit/beta/conversations/guide/catalog/legal/events/circle.manage/recommendations', 'Não pode correr hard-delete', 'Não vê includeTestData'] },
  { key: 'admin_moderator', email: email('beta.admin.moderator'), accountName: 'Beta Moderator', adminRole: 'MODERATOR',
    scenario: 'Moderação: verificações, fotos, reports',
    expected: ['Aprova/rejeita verification queue', 'Aprova/rejeita fotos pendentes', 'Vê moderation.evidence.view', 'Não vê subscriptions/finance'] },
  { key: 'admin_support', email: email('beta.admin.support'), accountName: 'Beta Support', adminRole: 'SUPPORT',
    scenario: 'Apoio ao cliente: users + reports, sem evidence',
    expected: ['Vê ficha de utilizador', 'Vê reports', 'NÃO vê moderation.evidence.view (evidence de reports)', 'Não vê subscriptions'] },
  { key: 'admin_finance', email: email('beta.admin.finance'), accountName: 'Beta Finance', adminRole: 'FINANCE',
    scenario: 'Billing/subscriptions, sem moderação',
    expected: ['Vê subscriptions e métricas', 'NÃO vê reports/moderação/users'] },
  { key: 'admin_content', email: email('beta.admin.content'), accountName: 'Beta Content Reviewer', adminRole: 'CONTENT_REVIEWER',
    scenario: 'Guide + fotos/perfis, sem reports',
    expected: ['Gere artigos do Between Guide', 'Vê fotos/perfis', 'NÃO vê reports/subscriptions'] },
]

export type LifecycleKey =
  | 'lifecycle_pending_email' | 'lifecycle_pending_age' | 'lifecycle_active'
  | 'lifecycle_suspended' | 'lifecycle_banned'
  | 'lifecycle_profile_pending' | 'lifecycle_profile_rejected' | 'lifecycle_profile_hidden'

export interface LifecycleAccountScenario {
  key: LifecycleKey
  email: string
  accountName: string
  scenario: string
  expected: string[]
}

// BETA.1.10 — one account per lifecycle state named in the spec. Actual
// construction (which fields to set / which service to call) lives in
// accounts.ts — this manifest only records intent, so validateBetaSeed.ts
// can check the OUTCOME against the same list without duplicating logic.
export const LIFECYCLE_ACCOUNTS: LifecycleAccountScenario[] = [
  { key: 'lifecycle_pending_email', email: email('beta.lifecycle.pending-email'), accountName: 'Lifecycle Pending Email',
    scenario: 'Registo feito, email por confirmar', expected: ['status=PENDING_VERIFICATION', 'emailVerifiedAt=null'] },
  { key: 'lifecycle_pending_age', email: email('beta.lifecycle.pending-age'), accountName: 'Lifecycle Pending Age',
    scenario: 'Email confirmado, verificação de idade/identidade pendente',
    expected: ['status=PENDING_VERIFICATION', 'emailVerifiedAt setado', 'Verification.status=PENDING'] },
  { key: 'lifecycle_active', email: email('beta.lifecycle.active'), accountName: 'Lifecycle Active',
    scenario: 'Conta totalmente ativa via UserActivationService',
    expected: ['status=ACTIVE (via evaluateAndActivateUser)', 'satisfiedBy inclui EMAIL_VERIFICATION'] },
  { key: 'lifecycle_suspended', email: email('beta.lifecycle.suspended'), accountName: 'Lifecycle Suspended',
    scenario: 'Conta suspensa por admin', expected: ['status=SUSPENDED', 'não pode login (canLogin=false)'] },
  { key: 'lifecycle_banned', email: email('beta.lifecycle.banned'), accountName: 'Lifecycle Banned',
    scenario: 'Conta banida', expected: ['status=BANNED', 'não pode login'] },
  { key: 'lifecycle_profile_pending', email: email('beta.lifecycle.profile-pending'), accountName: 'Lifecycle Profile Pending',
    scenario: 'User ACTIVE, Profile PENDING_REVIEW', expected: ['User.status=ACTIVE', 'Profile.status=PENDING_REVIEW', 'não aparece em Discovery'] },
  { key: 'lifecycle_profile_rejected', email: email('beta.lifecycle.profile-rejected'), accountName: 'Lifecycle Profile Rejected',
    scenario: 'User ACTIVE, Profile REJECTED com motivo', expected: ['Profile.status=REJECTED', 'rejectionReason preenchido'] },
  { key: 'lifecycle_profile_hidden', email: email('beta.lifecycle.profile-hidden'), accountName: 'Lifecycle Profile Hidden',
    scenario: 'User ACTIVE, Profile HIDDEN (admin ocultou)', expected: ['Profile.status=HIDDEN', 'não aparece em Discovery apesar de aprovado antes'] },
]

export interface IndividualScenario {
  key: string
  email: string
  displayName: string
  accountName: string
  gender: string
  orientation: string
  relationshipStatus: string
  city: string
  country: string
  bio: string
  discretionLevel: 'MAXIMUM' | 'SELECTIVE' | 'OPEN'
  visibilityMode: 'PUBLIC' | 'MATCHES_ONLY' | 'INVISIBLE'
  intentions: Array<{ slug: string; preference: 'YES' | 'MAYBE' | 'NO' }>
  boundaries: Array<{ slug: string; preference: 'YES' | 'MAYBE' | 'NO' }>
  privacy?: Partial<{ invisibleMode: boolean; visibleInDiscovery: boolean; showDistance: boolean; allowPhotoRequests: boolean; notificationMode: 'NORMAL' | 'DISCREET' | 'SILENT' }>
  isPremium?: boolean
  scenario: string
  expected: string[]
}

// BETA.1.11 — 12 individual profiles, each built around one named test
// objective from the spec. dateOfBirth values are relative-ish fixed
// adult ages (all clearly 18+), not meaningful beyond passing the age
// requirement.
export const INDIVIDUAL_SCENARIOS: IndividualScenario[] = [
  { key: 'individual_marta', email: email('beta.marta'), displayName: 'Marta', accountName: 'Marta Teste',
    gender: 'woman', orientation: 'bisexual', relationshipStatus: 'SINGLE', city: 'Lisboa', country: 'Portugal',
    bio: 'Aberta a conhecer casais com calma. Gosto de conversar antes de qualquer encontro.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'seek_couple', preference: 'YES' }, { slug: 'recurring_connection', preference: 'YES' }],
    boundaries: [{ slug: 'couples_only', preference: 'NO' }, { slug: 'talk_first', preference: 'YES' }],
    scenario: 'Individual aberta a casais — Third Match', expected: ['Aparece como candidata para Casal 1 (seek_third)', 'Between Score alto com Casal 1', 'NUNCA aparece no Discovery de individual_joana (ACTIVE MATCH entre ambas — exclusão intencional, ver match_individual_active)'] },
  { key: 'individual_leonor', email: email('beta.leonor'), displayName: 'Leonor', accountName: 'Leonor Teste',
    gender: 'woman', orientation: 'straight', relationshipStatus: 'SINGLE', city: 'Porto', country: 'Portugal',
    bio: 'Prefiro ligações um-para-um. Casais não são o que procuro neste momento.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'recurring_connection', preference: 'YES' }],
    boundaries: [{ slug: 'no_couples', preference: 'YES' }],
    scenario: 'Individual que exclui casais (hard boundary)', expected: ['Nunca aparece no Discovery de nenhum perfil COUPLE com seek_third', 'Exclusão confirmada por BoundaryCompatibilityService'] },
  { key: 'individual_diogo', email: email('beta.diogo'), displayName: 'Diogo', accountName: 'Diogo Teste',
    gender: 'man', orientation: 'straight', relationshipStatus: 'COMMITTED', city: 'Coimbra', country: 'Portugal',
    bio: 'Muito reservado. Prefiro que quase nada seja visível até haver confiança.',
    discretionLevel: 'MAXIMUM', visibilityMode: 'MATCHES_ONLY',
    intentions: [{ slug: 'conversation_only', preference: 'YES' }],
    boundaries: [{ slug: 'no_face_photos', preference: 'YES' }, { slug: 'discretion_required', preference: 'YES' }],
    privacy: { showDistance: false, notificationMode: 'SILENT' },
    scenario: 'Discrição máxima', expected: ['visibilityMode=MATCHES_ONLY', 'discretionLevel=MAXIMUM', 'sem fotos de rosto públicas'] },
  { key: 'individual_alex', email: email('beta.alex'), displayName: 'Alex', accountName: 'Alex Teste',
    gender: 'non_binary', orientation: 'pansexual', relationshipStatus: 'POLYAMOROUS', city: 'Lisboa', country: 'Portugal',
    bio: 'Poliamor há alguns anos. Interessado em ligações honestas e não hierárquicas.',
    discretionLevel: 'OPEN', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'polyamory', preference: 'YES' }, { slug: 'recurring_connection', preference: 'YES' }],
    boundaries: [{ slug: 'open_to_emotional', preference: 'YES' }],
    scenario: 'Não-binário / poliamor', expected: ['gender=non_binary via GenderOption real', 'compatibilidade de poly com outros perfis polyamory'] },
  { key: 'individual_joana', email: email('beta.joana'), displayName: 'Joana', accountName: 'Joana Teste',
    gender: 'woman', orientation: 'bisexual', relationshipStatus: 'OPEN', city: 'Lisboa', country: 'Portugal',
    bio: 'Já tive ligações recorrentes que correram muito bem — é o que procuro de novo.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'recurring_connection', preference: 'YES' }, { slug: 'seek_couple', preference: 'YES' }],
    boundaries: [{ slug: 'recurring_emotional_connection', preference: 'YES' }, { slug: 'talk_first', preference: 'YES' }],
    scenario: 'Ligação recorrente — score alto com Marta', expected: ['Between Score alto com individual_marta (mesma cidade, intenções sobrepostas)', 'NUNCA aparece no Discovery de individual_marta apesar do score alto — já têm ACTIVE MATCH (match_individual_active)'] },
  { key: 'individual_tiago', email: email('beta.tiago'), displayName: 'Tiago', accountName: 'Tiago Teste',
    gender: 'man', orientation: 'straight', relationshipStatus: 'SINGLE', city: 'Lisboa', country: 'Portugal',
    bio: 'Só perfis verificados, sem excepções.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'casual_encounter', preference: 'YES' }],
    boundaries: [{ slug: 'verified_only', preference: 'YES' }, { slug: 'singles_only', preference: 'YES' }],
    scenario: 'Hard boundary conflict alvo (singles_only)', expected: ['Não aparece no Discovery de perfis COUPLE (singles_only exclui casais)'] },
  { key: 'individual_ines', email: email('beta.ines'), displayName: 'Inês', accountName: 'Inês Teste',
    gender: 'woman', orientation: 'lesbian', relationshipStatus: 'SINGLE', city: 'Braga', country: 'Portugal',
    bio: 'Prefiro não ser encontrada por descoberta pública neste momento.',
    discretionLevel: 'MAXIMUM', visibilityMode: 'INVISIBLE',
    intentions: [{ slug: 'still_exploring', preference: 'YES' }],
    boundaries: [],
    privacy: { invisibleMode: true, visibleInDiscovery: false },
    scenario: 'Modo invisível', expected: ['Nunca aparece em Discovery de ninguém (invisibleMode=true)', 'canAppearInDiscovery=false via EligibilityService'] },
  { key: 'individual_rui', email: email('beta.rui'), displayName: 'Rui', accountName: 'Rui Teste',
    gender: 'man', orientation: 'gay', relationshipStatus: 'SINGLE', city: 'Faro', country: 'Portugal',
    bio: 'Só me sinto confortável com perfis verificados.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'recurring_connection', preference: 'YES' }],
    boundaries: [{ slug: 'verified_only', preference: 'YES' }],
    scenario: 'Verified only — eligibility boundary', expected: ['boundary verified_only=YES presente', 'usado para testar REQUIRE_TARGET_ACCEPTANCE'] },
  { key: 'individual_catarina', email: email('beta.catarina'), displayName: 'Catarina', accountName: 'Catarina Teste',
    gender: 'woman', orientation: 'bisexual', relationshipStatus: 'SINGLE', city: 'Lisboa', country: 'Portugal',
    bio: 'Vou estar no Porto em breve — abertas a conhecer gente de lá também.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'recurring_connection', preference: 'YES' }],
    boundaries: [],
    scenario: 'Travel Mode ativo (Porto)', expected: ['TravelMode ACTIVE para Porto', 'aparece em Discovery de perfis no Porto durante a janela'] },
  { key: 'individual_miguel', email: email('beta.miguel'), displayName: 'Miguel', accountName: 'Miguel Teste',
    gender: 'man', orientation: 'straight', relationshipStatus: 'SINGLE', city: 'Lisboa', country: 'Portugal',
    bio: 'Utilizador Premium — uso os filtros avançados regularmente.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'recurring_connection', preference: 'YES' }],
    boundaries: [],
    isPremium: true,
    scenario: 'Premium — filtros avançados / HIGH_COMPATIBILITY_DISCOVERY', expected: ['Subscription plan=PREMIUM status=ACTIVE', 'Aparece no Discovery de individual_sofia (par HIGH_COMPATIBILITY_DISCOVERY — mesma cidade, intenção recurring_connection em comum, sem LIKE/PASS/BLOCK/MATCH prévio)'] },
  { key: 'individual_sofia', email: email('beta.sofia'), displayName: 'Sofia', accountName: 'Sofia Teste',
    gender: 'woman', orientation: 'pansexual', relationshipStatus: 'SINGLE', city: 'Lisboa', country: 'Portugal',
    bio: 'Tenho uma galeria privada — peço para conhecer melhor a pessoa primeiro.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'recurring_connection', preference: 'YES' }],
    boundaries: [{ slug: 'private_gallery_requests', preference: 'YES' }],
    scenario: 'Galeria privada / Soft Reveal / HIGH_COMPATIBILITY_DISCOVERY', expected: ['Tem ProfilePhoto PRIVATE_AFTER_APPROVAL', 'PhotoAccessRequest/Approval cenário Soft Reveal', 'Aparece no Discovery de individual_miguel — par deliberado sem interação prévia, usado para provar que um match de alta compatibilidade É incluído (ver Discovery validation follow-up)'] },
  { key: 'individual_noa', email: email('beta.noa'), displayName: 'Noa', accountName: 'Noa Teste',
    gender: 'gender_fluid', orientation: 'questioning', relationshipStatus: 'OTHER', city: 'Lisboa', country: 'Portugal',
    bio: 'Ainda a perceber o que procuro exatamente.',
    discretionLevel: 'SELECTIVE', visibilityMode: 'PUBLIC',
    intentions: [{ slug: 'still_exploring', preference: 'YES' }],
    boundaries: [],
    scenario: 'Cold start — baixa especificidade de intenção', expected: ['Poucas intentions/boundaries preenchidas', 'usado para testar ranking cold-start (11.7)'] },
]

export interface CoupleMemberSeed {
  email: string
  accountName: string
  gender: string
  orientation: string
}

export interface CoupleScenario {
  key: string
  displayName: string
  city: string
  country: string
  bio: string
  members: CoupleMemberSeed[]
  pendingInviteEmail?: string // Casal 3 only — never becomes a real account
  intentions: Array<{ slug: string; preference: 'YES' | 'MAYBE' | 'NO' }>
  agreementOutcome: 'ALIGNED' | 'CONFLICT' | 'WAITING_MEMBERS' | 'NONE'
  travelMode?: { city: string; status: 'SCHEDULED' | 'WAITING_MEMBER_APPROVAL' }
  maxPrivacy?: boolean
  // BETA.2 (FASE E) — Shared Profile individual-discovery policy end
  // state to seed (see schema.prisma's IndividualDiscoveryPolicy enum).
  // Undefined = SHARED_ONLY (the real default — most couples shouldn't
  // need to touch this).
  individualDiscoveryPolicy?: 'INDIVIDUAL_AND_SHARED' | 'SHARED_ONLY'
  scenario: string
  expected: string[]
}

// BETA.1.12 — 5 couples. Casal 3 is deliberately incomplete (one member
// only) — its second "member" is an invitedEmail on a PENDING
// ProfileMember row, never a real User/Verification/Subscription, exactly
// matching what an actually-pending couple invite looks like in
// production.
export const COUPLE_SCENARIOS: CoupleScenario[] = [
  { key: 'couple_1_third_match', displayName: 'Ana & Pedro', city: 'Lisboa', country: 'Portugal',
    bio: 'Casal há 6 anos, curiosos e alinhados sobre o que procuramos.',
    members: [
      { email: email('beta.couple1.ana'), accountName: 'Ana Teste', gender: 'woman', orientation: 'bisexual' },
      { email: email('beta.couple1.pedro'), accountName: 'Pedro Teste', gender: 'man', orientation: 'straight' },
    ],
    intentions: [{ slug: 'seek_third', preference: 'YES' }],
    agreementOutcome: 'ALIGNED',
    // BETA.2 (FASE E) — this is the INDIVIDUAL_AND_SHARED demo: both
    // Ana's and Pedro's own Individual Profiles are also discoverable
    // separately from the couple, unanimous-approved end state.
    individualDiscoveryPolicy: 'INDIVIDUAL_AND_SHARED',
    scenario: 'Third match happy path + Individual Discovery policy', expected: ['ProfileAgreement.status=ALIGNED', 'CoupleProfile.coupleStatus=ACTIVE', 'match com individual_marta via double consent ALL', 'individualDiscoveryPolicy=INDIVIDUAL_AND_SHARED — Ana e Pedro aparecem também como indivíduos no Discovery'] },
  { key: 'couple_2_conflict', displayName: 'Carla & Nuno', city: 'Porto', country: 'Portugal',
    bio: 'Casal a explorar limites em conjunto — ainda a alinhar alguns pontos.',
    members: [
      { email: email('beta.couple2.carla'), accountName: 'Carla Teste', gender: 'woman', orientation: 'straight' },
      { email: email('beta.couple2.nuno'), accountName: 'Nuno Teste', gender: 'man', orientation: 'straight' },
    ],
    intentions: [{ slug: 'seek_third', preference: 'MAYBE' }],
    agreementOutcome: 'CONFLICT',
    scenario: 'Agreement conflict', expected: ['ProfileAgreement.status=CONFLICT (respostas divergentes em no_emotional_involvement)', 'UI mostra "não estão alinhados nisto" sem revelar quem respondeu quê'] },
  { key: 'couple_3_pending', displayName: 'Vera & (convite pendente)', city: 'Lisboa', country: 'Portugal',
    bio: 'Perfil de casal em criação — a aguardar o/a parceiro/a aceitar o convite.',
    members: [
      { email: email('beta.couple3.vera'), accountName: 'Vera Teste', gender: 'woman', orientation: 'bisexual' },
    ],
    pendingInviteEmail: email('beta.couple3.pending-invite'),
    intentions: [{ slug: 'seek_third', preference: 'MAYBE' }],
    agreementOutcome: 'WAITING_MEMBERS',
    scenario: 'Pending partner', expected: ['CoupleProfile.coupleStatus=PENDING_PARTNER', 'ProfileMember do 2º membro status=PENDING sem userId', 'excluído do Discovery (perfil incompleto)'] },
  { key: 'couple_4_travel', displayName: 'Beatriz & Hugo', city: 'Lisboa', country: 'Portugal',
    bio: 'Vamos estar no Porto num fim de semana em breve, abertos a conhecer gente de lá.',
    members: [
      { email: email('beta.couple4.beatriz'), accountName: 'Beatriz Teste', gender: 'woman', orientation: 'bisexual' },
      { email: email('beta.couple4.hugo'), accountName: 'Hugo Teste', gender: 'man', orientation: 'straight' },
    ],
    intentions: [{ slug: 'seek_third', preference: 'YES' }],
    agreementOutcome: 'ALIGNED',
    travelMode: { city: 'Porto', status: 'SCHEDULED' },
    scenario: 'Couple Travel Mode aprovado por ambos', expected: ['TravelModeApproval de ambos os membros com approvedAt', 'TravelMode.status=SCHEDULED'] },
  { key: 'couple_5_privacy', displayName: 'Rita & Filipe', city: 'Lisboa', country: 'Portugal',
    bio: 'Muito reservados — preferimos conhecer bem antes de partilhar mais.',
    members: [
      { email: email('beta.couple5.rita'), accountName: 'Rita Teste', gender: 'woman', orientation: 'bisexual' },
      { email: email('beta.couple5.filipe'), accountName: 'Filipe Teste', gender: 'man', orientation: 'straight' },
    ],
    intentions: [{ slug: 'seek_third', preference: 'MAYBE' }],
    agreementOutcome: 'ALIGNED',
    maxPrivacy: true,
    scenario: 'Máxima privacidade — galeria privada + soft reveal', expected: ['discretionLevel=MAXIMUM', 'visibilityMode=MATCHES_ONLY', 'fotos PRIVATE_AFTER_APPROVAL'] },
]

export interface GroupScenario {
  key: string
  displayName: string
  members: CoupleMemberSeed[]
  scenario: string
  expected: string[]
}

// BETA.1.13 — only created if isGroupProfilesEnabled() at seed time.
export const GROUP_SCENARIO: GroupScenario = {
  key: 'group_poly_trio',
  displayName: 'Trio Aurora',
  members: [
    { email: email('beta.group.luna'), accountName: 'Luna Teste', gender: 'woman', orientation: 'pansexual' },
    { email: email('beta.group.davi'), accountName: 'Davi Teste', gender: 'man', orientation: 'bisexual' },
    { email: email('beta.group.iris'), accountName: 'Iris Teste', gender: 'non_binary', orientation: 'queer' },
  ],
  scenario: 'Grupo poliamoroso (3 membros) — só se GROUP_PROFILES_ENABLED',
  expected: ['Profile.type=GROUP', '3 ProfileMember ACCEPTED', 'badge de tipo Grupo no Discovery', 'membership de Private Room inclui os 3'],
}

// Every scenarioKey this manifest defines, flattened — used by the
// validator to confirm 1:1 coverage and by cleanup to double-check it
// isn't missing anything the seed itself created.
export const ALL_SCENARIO_KEYS = (): string[] => [
  ...ADMIN_ACCOUNTS.map(a => a.key),
  ...LIFECYCLE_ACCOUNTS.map(a => a.key),
  ...INDIVIDUAL_SCENARIOS.map(a => a.key),
  ...COUPLE_SCENARIOS.map(a => a.key),
  GROUP_SCENARIO.key,
]
