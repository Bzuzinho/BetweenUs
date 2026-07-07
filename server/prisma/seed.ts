import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding intentions...')

  const intentions = [
    { slug: 'casual_encounter',     name: 'Encontro casual',            description: 'Encontro pontual sem compromisso' },
    { slug: 'recurring_connection', name: 'Ligação recorrente',         description: 'Encontros regulares ao longo do tempo' },
    { slug: 'trio_experience',      name: 'Experiência a três',         description: 'Experiência entre três pessoas' },
    { slug: 'swing',                name: 'Swing',                      description: 'Troca de parceiros entre casais' },
    { slug: 'polyamory',            name: 'Poliamor',                   description: 'Relações múltiplas consensuais' },
    { slug: 'online_only',          name: 'Apenas online',              description: 'Ligação exclusivamente digital' },
    { slug: 'friends_with_benefits',name: 'Amizade colorida',           description: 'Amizade com componente íntima' },
    { slug: 'fetish_exploration',   name: 'Explorar fetiches',          description: 'Exploração de interesses específicos' },
    { slug: 'seek_couple',          name: 'Procurar casal',             description: 'Solteiro/a interessado/a em casal' },
    { slug: 'seek_third',           name: 'Procurar terceira pessoa',   description: 'Casal à procura de terceira pessoa' },
    { slug: 'conversation_only',    name: 'Apenas conversa',            description: 'Conversa discreta sem encontro' },
    { slug: 'open_relationship',    name: 'Relação aberta',             description: 'Pessoa em relação aberta' },
    { slug: 'still_exploring',      name: 'Ainda a descobrir',          description: 'Sem certeza do que procuro' },
  ]

  for (const [index, intention] of intentions.entries()) {
    await prisma.intention.upsert({
      where: { slug: intention.slug },
      update: { name: intention.name, description: intention.description },
      create: { slug: intention.slug, name: intention.name, description: intention.description, sortOrder: index, active: true },
    })
  }
  console.log(`Seeded ${intentions.length} intentions`)

  console.log('Seeding boundaries...')

  const boundaries = [
    // relationship_type
    { slug: 'no_emotional_involvement',      name: 'Sem envolvimento emocional',       category: 'relationship_type' },
    { slug: 'open_to_emotional',             name: 'Aberto a envolvimento emocional',  category: 'relationship_type' },
    { slug: 'recurring_emotional_connection',name: 'Envolvimento emocional recorrente',category: 'relationship_type' },
    { slug: 'no_couples',                    name: 'Não quero casais',                 category: 'relationship_type', isHardBoundary: true },
    { slug: 'couples_only',                  name: 'Apenas casais',                    category: 'relationship_type', isHardBoundary: true },
    { slug: 'singles_only',                  name: 'Apenas solteiros',                 category: 'relationship_type', isHardBoundary: true },
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
    { slug: 'verified_only',             name: 'Apenas perfis verificados',         category: 'privacy' },
    { slug: 'discretion_required',       name: 'Discrição obrigatória',             category: 'privacy' },
    // conversation_style
    { slug: 'talk_first',               name: 'Conversar primeiro',        category: 'conversation_style' },
    { slug: 'talk_online_first',        name: 'Falar online antes de marcar', category: 'conversation_style' },
    { slug: 'direct_approach',          name: 'Abordagem directa',         category: 'conversation_style' },
    { slug: 'slow_pace',                name: 'Ritmo lento',               category: 'conversation_style' },
    { slug: 'fast_pace',                name: 'Ritmo rápido',              category: 'conversation_style' },
  ]

  for (const [index, boundary] of boundaries.entries()) {
    await prisma.boundary.upsert({
      where: { slug: boundary.slug },
      update: { name: boundary.name, category: boundary.category },
      create: {
        slug: boundary.slug, name: boundary.name, category: boundary.category,
        isHardBoundary: (boundary as any).isHardBoundary || false,
        sensitive: (boundary as any).sensitive || false,
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

  console.log('Seed complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
