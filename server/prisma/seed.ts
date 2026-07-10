import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding intentions...')

  // 4.6 — category values are a fixed reference set (CONNECTION_TYPE,
  // RELATIONSHIP_MODEL, EXPERIENCE, COMMUNICATION, EMOTIONAL), same
  // free-string-but-conventionally-fixed pattern Boundary.category already
  // uses. complementarySlug links seek_couple <-> seek_third — an
  // individual open to couples and a couple seeking a third are the same
  // real-world interaction from each side; see IntentionCompatibilityService.
  const intentions = [
    { slug: 'casual_encounter',     name: 'Encontro casual',            description: 'Encontro pontual sem compromisso',       category: 'EXPERIENCE' },
    { slug: 'recurring_connection', name: 'Ligação recorrente',         description: 'Encontros regulares ao longo do tempo',  category: 'RELATIONSHIP_MODEL' },
    { slug: 'trio_experience',      name: 'Experiência a três',         description: 'Experiência entre três pessoas',         category: 'EXPERIENCE', sensitive: true },
    { slug: 'swing',                name: 'Swing',                      description: 'Troca de parceiros entre casais',        category: 'EXPERIENCE', sensitive: true },
    { slug: 'polyamory',            name: 'Poliamor',                   description: 'Relações múltiplas consensuais',         category: 'RELATIONSHIP_MODEL' },
    { slug: 'online_only',          name: 'Apenas online',              description: 'Ligação exclusivamente digital',         category: 'COMMUNICATION' },
    { slug: 'friends_with_benefits',name: 'Amizade colorida',           description: 'Amizade com componente íntima',          category: 'RELATIONSHIP_MODEL' },
    { slug: 'fetish_exploration',   name: 'Explorar fetiches',          description: 'Exploração de interesses específicos',   category: 'EXPERIENCE', sensitive: true },
    { slug: 'seek_couple',          name: 'Procurar casal',             description: 'Solteiro/a interessado/a em casal',      category: 'CONNECTION_TYPE', complementarySlug: 'seek_third' },
    { slug: 'seek_third',           name: 'Procurar terceira pessoa',   description: 'Casal à procura de terceira pessoa',     category: 'CONNECTION_TYPE', complementarySlug: 'seek_couple' },
    { slug: 'conversation_only',    name: 'Apenas conversa',            description: 'Conversa discreta sem encontro',         category: 'COMMUNICATION' },
    { slug: 'open_relationship',    name: 'Relação aberta',             description: 'Pessoa em relação aberta',               category: 'RELATIONSHIP_MODEL' },
    { slug: 'still_exploring',      name: 'Ainda a descobrir',          description: 'Sem certeza do que procuro',             category: 'EMOTIONAL' },
  ]

  for (const [index, intention] of intentions.entries()) {
    await prisma.intention.upsert({
      where: { slug: intention.slug },
      update: { name: intention.name, description: intention.description, category: intention.category, sensitive: !!intention.sensitive, complementarySlug: (intention as any).complementarySlug || null },
      create: { slug: intention.slug, name: intention.name, description: intention.description, category: intention.category, sensitive: !!intention.sensitive, complementarySlug: (intention as any).complementarySlug || null, sortOrder: index, active: true },
    })
  }
  console.log(`Seeded ${intentions.length} intentions`)

  console.log('Seeding boundaries...')

  // Discovery validation follow-up — no_couples/couples_only/singles_only/
  // verified_only are CANDIDATE_CONSTRAINT boundaries (compared against
  // the CANDIDATE's structural properties — Profile.type, verification
  // status — never against a same-slug boundary the candidate happens to
  // also hold; see candidateConstraintService.ts for why the previous
  // MUTUAL_ALIGNMENT default silently never excluded anyone). verified_only
  // additionally gets isHardBoundary flipped to true here — it was never
  // actually hard before (a pre-existing, separate bug: the catalog entry
  // omitted isHardBoundary entirely, so it silently defaulted to false and
  // never excluded anyone even though the product clearly intends it to).
  const boundaries = [
    // relationship_type
    { slug: 'no_emotional_involvement',      name: 'Sem envolvimento emocional',       category: 'relationship_type' },
    { slug: 'open_to_emotional',             name: 'Aberto a envolvimento emocional',  category: 'relationship_type' },
    { slug: 'recurring_emotional_connection',name: 'Envolvimento emocional recorrente',category: 'relationship_type' },
    { slug: 'no_couples',                    name: 'Não quero casais',                 category: 'relationship_type', isHardBoundary: true, ruleType: 'CANDIDATE_CONSTRAINT', constraintType: 'EXCLUDE_COUPLES' },
    { slug: 'couples_only',                  name: 'Apenas casais',                    category: 'relationship_type', isHardBoundary: true, ruleType: 'CANDIDATE_CONSTRAINT', constraintType: 'COUPLES_ONLY' },
    { slug: 'singles_only',                  name: 'Apenas solteiros',                 category: 'relationship_type', isHardBoundary: true, ruleType: 'CANDIDATE_CONSTRAINT', constraintType: 'INDIVIDUALS_ONLY' },
    // meeting_type
    { slug: 'online_only',              name: 'Apenas online',                    category: 'meeting_type' },
    { slug: 'open_to_meeting',          name: 'Aberto a encontro presencial',     category: 'meeting_type' },
    { slug: 'one_time_only',            name: 'Apenas uma vez',                   category: 'meeting_type' },
    { slug: 'recurring_ok',             name: 'Aberto a encontros recorrentes',   category: 'meeting_type' },
    { slug: 'meet_after_conversation',  name: 'Só encontro depois de conversar',  category: 'meeting_type' },
    { slug: 'spontaneous_meeting',      name: 'Encontro espontâneo',              category: 'meeting_type' },
    // privacy
    { slug: 'no_face_photos',            name: 'Sem fotos de rosto',                category: 'privacy', sensitive: true },
    { slug: 'face_visible_before_match', name: 'Rosto visível antes do match',      category: 'privacy', sensitive: true },
    { slug: 'face_visible_after_match',  name: 'Rosto visível depois do match',     category: 'privacy', sensitive: true },
    { slug: 'private_gallery_requests',  name: 'Aceito pedidos de galeria privada', category: 'privacy', sensitive: true },
    { slug: 'no_known_contacts',         name: 'Sem pessoas conhecidas',            category: 'privacy', sensitive: true },
    { slug: 'verified_only',             name: 'Apenas perfis verificados',         category: 'privacy', isHardBoundary: true, ruleType: 'CANDIDATE_CONSTRAINT', constraintType: 'VERIFIED_ONLY' },
    { slug: 'discretion_required',       name: 'Discrição obrigatória',             category: 'privacy' },
    // conversation_style
    { slug: 'talk_first',               name: 'Conversar primeiro',        category: 'conversation_style' },
    { slug: 'talk_online_first',        name: 'Falar online antes de marcar', category: 'conversation_style' },
    { slug: 'direct_approach',          name: 'Abordagem directa',         category: 'conversation_style' },
    { slug: 'slow_pace',                name: 'Ritmo lento',               category: 'conversation_style' },
    { slug: 'fast_pace',                name: 'Ritmo rápido',              category: 'conversation_style' },
  ]

  for (const [index, boundary] of boundaries.entries()) {
    // Discovery validation follow-up — `update:` previously only synced
    // name/category, meaning re-running this seed against an environment
    // that already had these rows (Railway) would NEVER apply an
    // isHardBoundary/ruleType/constraintType/sensitive change to an
    // existing boundary — silently defeating this very fix. Now synced on
    // every run, same fields as `create:`, so the seed is a real source of
    // truth for the whole row, not just new rows.
    const ruleType = (boundary as any).ruleType || 'MUTUAL_ALIGNMENT'
    const constraintType = (boundary as any).constraintType || null
    const isHardBoundary = (boundary as any).isHardBoundary || false
    const sensitive = (boundary as any).sensitive || false
    await prisma.boundary.upsert({
      where: { slug: boundary.slug },
      update: { name: boundary.name, category: boundary.category, isHardBoundary, ruleType: ruleType as any, constraintType: constraintType as any, sensitive },
      create: {
        slug: boundary.slug, name: boundary.name, category: boundary.category,
        isHardBoundary, ruleType: ruleType as any, constraintType: constraintType as any, sensitive,
        sortOrder: index, active: true,
      },
    })
  }
  console.log(`Seeded ${boundaries.length} boundaries`)

  console.log('Seeding gender options...')

  const genders = [
    { slug: 'man',                label: 'Homem' },
    { slug: 'woman',              label: 'Mulher' },
    { slug: 'non_binary',         label: 'Não-binário' },
    { slug: 'transgender_man',    label: 'Homem trans' },
    { slug: 'transgender_woman',  label: 'Mulher trans' },
    { slug: 'gender_fluid',       label: 'Género fluido' },
    { slug: 'agender',            label: 'Agénero' },
    { slug: 'questioning',        label: 'Em descoberta' },
    { slug: 'other',              label: 'Outra identidade' },
    { slug: 'prefer_not_to_say',  label: 'Prefiro não dizer' },
  ]

  for (const [index, gender] of genders.entries()) {
    await prisma.genderOption.upsert({
      where: { slug: gender.slug },
      update: { label: gender.label },
      create: { slug: gender.slug, label: gender.label, sortOrder: index, active: true },
    })
  }
  console.log(`Seeded ${genders.length} gender options`)

  console.log('Seeding orientation options...')

  const orientations = [
    { slug: 'straight',     label: 'Heterossexual' },
    { slug: 'gay',          label: 'Gay' },
    { slug: 'lesbian',      label: 'Lésbica' },
    { slug: 'bisexual',     label: 'Bissexual' },
    { slug: 'pansexual',    label: 'Pansexual' },
    { slug: 'asexual',      label: 'Assexual' },
    { slug: 'demisexual',   label: 'Demissexual' },
    { slug: 'queer',        label: 'Queer' },
    { slug: 'questioning',  label: 'Em descoberta' },
    { slug: 'other',        label: 'Outra' },
    { slug: 'prefer_not_to_say', label: 'Prefiro não dizer' },
  ]

  for (const [index, orientation] of orientations.entries()) {
    await prisma.orientationOption.upsert({
      where: { slug: orientation.slug },
      update: { label: orientation.label },
      create: { slug: orientation.slug, label: orientation.label, sortOrder: index, active: true },
    })
  }
  console.log(`Seeded ${orientations.length} orientation options`)

  console.log('Seeding legal documents (v1.0)...')
  const legalDocs = [
    {
      consentType: 'TERMS' as const,
      version: '1.0',
      title: 'Termos de Utilização',
      content: `Última atualização: Junho 2026

1. ACEITAÇÃO DOS TERMOS
Ao criar uma conta na Between Us, confirmas que tens pelo menos 18 anos e aceitas estes Termos de Utilização na íntegra.

2. NATUREZA DO SERVIÇO
A Between Us é uma plataforma privada para ligações adultas, consensuais e discretas entre pessoas solteiras, casais e pessoas em relações abertas ou poliamorosas. Não toleramos conteúdo que envolva menores, coerção, ou atividades ilegais.

3. CONTA E ELEGIBILIDADE
Apenas maiores de 18 anos podem criar conta. És responsável por manter a confidencialidade da tua password e por toda a atividade na tua conta.

4. CONDUTA DO UTILIZADOR
É proibido: assediar outros utilizadores, partilhar conteúdo não consentido, criar perfis falsos, usar a plataforma para fins comerciais não autorizados, ou contactar menores.

5. CONTEÚDO E MODERAÇÃO
Todas as fotos passam por moderação antes de ficarem visíveis. Reservamo-nos o direito de remover conteúdo ou suspender contas que violem estes termos.

6. SUBSCRIÇÕES E PAGAMENTOS
Os planos Premium são processados via Stripe. Podes cancelar a qualquer momento; o acesso premium mantém-se até ao fim do período já pago.

7. LIMITAÇÃO DE RESPONSABILIDADE
A Between Us não se responsabiliza por interações entre utilizadores fora da plataforma. Recomendamos sempre cautela em encontros presenciais.

8. RESCISÃO
Podes apagar a tua conta a qualquer momento nas definições. Reservamo-nos o direito de suspender contas que violem estes termos.

9. ALTERAÇÕES
Podemos atualizar estes termos periodicamente. Notificaremos sobre alterações significativas.`,
      requiresReacceptance: true,
    },
    {
      consentType: 'PRIVACY_POLICY' as const,
      version: '1.0',
      title: 'Política de Privacidade',
      content: `Última atualização: Junho 2026

1. DADOS QUE RECOLHEMOS
Email, data de nascimento, informações de perfil (que escolhes partilhar), fotos, mensagens, e dados de utilização da app.

2. COMO USAMOS OS TEUS DADOS
Para criar e gerir a tua conta, mostrar perfis compatíveis, processar pagamentos, e melhorar a segurança da plataforma.

3. PARTILHA DE DADOS
Nunca vendemos os teus dados. Partilhamos apenas com: processadores de pagamento (Stripe), serviços de armazenamento (Cloudflare R2), e quando legalmente exigido.

4. CONTACTOS BLOQUEADOS
Quando bloqueias contactos, convertemos os dados imediatamente em hash criptográfico HMAC-SHA256. Os valores originais nunca são guardados.

5. FOTOS E SOFT REVEAL
As tuas fotos são armazenadas de forma segura. O Soft Reveal permite-te controlar quem vê o quê e quando. Fotos de verificação são apagadas após revisão.

6. OS TEUS DIREITOS (RGPD)
Tens direito a aceder, corrigir, apagar, ou exportar os teus dados a qualquer momento. Podes revogar consentimentos opcionais nas definições.

7. RETENÇÃO DE DADOS
Mantemos os teus dados enquanto a conta estiver ativa. Após eliminação da conta, os dados são apagados num prazo de 30 dias, exceto quando a lei exigir retenção.

8. SEGURANÇA
Usamos encriptação, autenticação de dois fatores (em breve), e auditoria de acessos administrativos para proteger os teus dados.

9. CONTACTO
Para questões sobre privacidade: privacy@betweenus.app`,
      requiresReacceptance: true,
    },
  ]
  for (const doc of legalDocs) {
    await prisma.legalDocument.upsert({
      where: { consentType_version: { consentType: doc.consentType, version: doc.version } },
      update: {},
      create: doc,
    })
  }
  console.log(`Seeded ${legalDocs.length} legal documents`)

  console.log('Seeding private interests...')

  // 4.8 — kept deliberately generic/non-explicit at the seed level; these
  // are meant to be extended by an admin who knows the product's real
  // taxonomy, not to ship a finished list here.
  const privateInterests = [
    { slug: 'roleplay',          label: 'Roleplay',                category: 'EXPERIENCE' },
    { slug: 'power_dynamics',    label: 'Dinâmicas de poder',       category: 'EXPERIENCE' },
    { slug: 'exhibitionism',     label: 'Exibicionismo',            category: 'EXPERIENCE' },
    { slug: 'voyeurism',         label: 'Voyeurismo',               category: 'EXPERIENCE' },
    { slug: 'group_experiences', label: 'Experiências em grupo',    category: 'EXPERIENCE' },
    { slug: 'toys_exploration',  label: 'Exploração com brinquedos',category: 'EXPERIENCE' },
    { slug: 'still_curious',     label: 'Ainda curioso/a',          category: 'EMOTIONAL' },
  ]
  for (const [index, interest] of privateInterests.entries()) {
    await prisma.privateInterest.upsert({
      where: { slug: interest.slug },
      update: { label: interest.label, category: interest.category },
      create: { slug: interest.slug, label: interest.label, category: interest.category, sortOrder: index, active: true },
    })
  }
  console.log(`Seeded ${privateInterests.length} private interests`)

  console.log('Seeding agreement questions...')

  // 6.2 — AgreementQuestion is deliberately NOT a duplicate of Boundary.
  // Almost every example question in the Sprint 6 spec (pace, privacy,
  // meeting type...) already exists as a Boundary from the seed above -
  // those stay boundaries because they're third-party compatibility
  // signals (compared against a candidate's own boundaries). This catalog
  // is reserved for questions that are purely about the couple/group's
  // OWN internal process and have no meaning as a compatibility signal
  // against an external profile.
  const agreementQuestions = [
    { slug: 'both_validate_match',     label: 'Os dois têm de validar um match antes de avançar', category: 'PROCESS' },
    { slug: 'both_validate_photo_access', label: 'Os dois têm de aprovar pedidos de acesso a fotos privadas', category: 'PROCESS' },
    { slug: 'both_present_first_chat', label: 'Ambos preferem estar presentes na primeira conversa', category: 'PROCESS' },
    { slug: 'debrief_after_meeting',   label: 'Preferem conversar em casal depois de cada encontro', category: 'PROCESS' },
  ]
  for (const [index, question] of agreementQuestions.entries()) {
    await (prisma as any).agreementQuestion.upsert({
      where: { slug: question.slug },
      update: { label: question.label, category: question.category },
      create: { slug: question.slug, label: question.label, category: question.category, sortOrder: index, active: true },
    })
  }
  console.log(`Seeded ${agreementQuestions.length} agreement questions`)

  // BETA.2.9 — presentational metadata for the 3 fixed structural
  // ProfileType values. Upsert syncs label/description/active/sortOrder
  // on every reseed (same discipline as the boundary upsert fix from the
  // Discovery validation follow-up) so an admin edit made via
  // /catalog/admin/profile-type-config is never silently reverted... but
  // ALSO so a genuine reseed-time content change here does propagate.
  // These 3 rows are the entire universe — never more, never fewer (see
  // schema.prisma's ProfileTypeConfig comment for why no create/delete
  // route exists).
  console.log('Seeding profile type config...')
  const profileTypeConfigs = [
    { type: 'INDIVIDUAL' as const, label: 'Individual', description: 'Uma pessoa, perfil próprio.', sortOrder: 0 },
    { type: 'COUPLE'     as const, label: 'Casal',      description: 'Duas pessoas, perfil partilhado.', sortOrder: 1 },
    { type: 'GROUP'       as const, label: 'Grupo',      description: 'Três ou mais pessoas, perfil partilhado.', sortOrder: 2 },
  ]
  for (const cfg of profileTypeConfigs) {
    await (prisma as any).profileTypeConfig.upsert({
      where: { type: cfg.type },
      update: { label: cfg.label, description: cfg.description, sortOrder: cfg.sortOrder },
      create: { type: cfg.type, label: cfg.label, description: cfg.description, sortOrder: cfg.sortOrder, active: true },
    })
  }
  console.log(`Seeded ${profileTypeConfigs.length} profile type configs`)

  console.log('Seed complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
