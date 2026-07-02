import { useParams, useNavigate } from 'react-router-dom'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

const PAGES = {
  terms: {
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
Podemos atualizar estes termos periodicamente. Notificaremos sobre alterações significativas.`
  },
  privacy: {
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
Para questões sobre privacidade: privacy@betweenus.app`
  },
  cookies: {
    title: 'Política de Cookies',
    content: `Última atualização: Junho 2026

Usamos cookies essenciais para manter a tua sessão ativa e cookies de preferências para lembrar as tuas escolhas (como idioma).

Não usamos cookies de publicidade ou rastreamento de terceiros.

Podes gerir as preferências de cookies nas definições do teu navegador.`
  },
  safety: {
    title: 'Segurança e Comunidade',
    content: `A Between Us tem tolerância zero para:

• Assédio ou insistência após recusa
• Exposição de terceiros sem consentimento
• Partilha não consentida de imagens
• Perfis falsos ou bots
• Menores de idade
• Discurso abusivo ou ameaças
• Captação de imagens sem consentimento

DENUNCIAR
Usa o botão de reportar em qualquer perfil, mensagem, ou foto. As denúncias são revistas pela nossa equipa de moderação.

SEGURANÇA EM ENCONTROS
• Usa sempre o Check-in de Encontro antes de um primeiro encontro presencial
• Encontra-te em locais públicos nas primeiras vezes
• Informa alguém de confiança sobre os teus planos
• Confia no teu instinto — usa o Safe Exit sempre que precisares

CONTACTO DE EMERGÊNCIA
Em caso de emergência real, contacta sempre as autoridades locais (112 em Portugal) antes de qualquer funcionalidade da app.`
  }
}

export default function LegalPage() {
  const { page } = useParams()
  const navigate = useNavigate()
  const doc = PAGES[page] || PAGES.terms

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 60px' }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        <button onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', color:C.text2,
            fontSize:14, cursor:'pointer', marginBottom:24, padding:0 }}>
          ← Voltar
        </button>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26,
          fontWeight:700, color:C.text, marginBottom:24 }}>
          {doc.title}
        </h1>
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
          borderRadius:20, padding:28 }}>
          <div style={{ color:C.text2, fontSize:14, lineHeight:1.8,
            whiteSpace:'pre-line' }}>
            {doc.content}
          </div>
        </div>
      </div>
    </div>
  )
}
