import { useState } from 'react'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88'
}

const ARTICLES = [
  {
    icon:'💑', title:'Como definir limites em casal', time:'5 min',
    content: `Definir limites em casal é o primeiro passo para explorar com segurança e confiança mútua.

Comecem por conversar a sós, sem pressa, sobre o que cada um sente confortável em partilhar. Usem o Mapa de Limites da app para marcar Sim, Talvez ou Não em cada categoria — fotos, encontros presenciais, envolvimento emocional, entre outras.

É normal que os limites de cada pessoa sejam diferentes. O sistema da Between Us assume sempre o limite mais restritivo entre os dois membros do casal, por isso não há necessidade de "convencer" o outro a aceitar mais do que se sente confortável.

Revisitem os limites regularmente — podem mudar com o tempo e a experiência. A comunicação honesta é mais importante do que ter "as respostas certas" logo de início.`
  },
  {
    icon:'🔓', title:'Como falar sobre fetiches sem pressão', time:'4 min',
    content: `Falar sobre fetiches pode gerar ansiedade, mas não precisa de ser assim.

Na Between Us, podes marcar interesses de forma privada — o sistema só revela compatibilidade quando ambas as partes assinalam o mesmo interesse, sem expor detalhes até existir match.

Quando decidires falar abertamente, evita assumir que o outro já sabe o que queres dizer. Sê específico, mas também aberto a perguntas. Não é preciso ter tudo definido — "estou curioso/a sobre isto, queres explorar?" já é um ótimo início.

Lembra-te: ninguém é obrigado a participar em nada. Um "não" ou "talvez no futuro" são respostas completamente válidas.`
  },
  {
    icon:'🛡️', title:'Segurança em encontros presenciais', time:'6 min',
    content: `Antes de um primeiro encontro presencial, há alguns passos que recomendamos sempre.

Usa o Check-in de Encontro da app — define a hora e local previstos, e a app pode alertar caso não confirmes que estás bem. Combina sempre o encontro num espaço público nas primeiras vezes.

Conversa por vídeo antes de te encontrares presencialmente, se possível. Confirma que a pessoa do perfil é quem diz ser. Informa um amigo ou familiar de confiança sobre onde vais e com quem.

Confia no teu instinto. Se algo parecer errado antes ou durante o encontro, tens todo o direito de sair. O botão Safe Exit existe exatamente para isso.`
  },
  {
    icon:'📱', title:'Privacidade digital', time:'3 min',
    content: `A tua privacidade é a prioridade central da Between Us.

Usa o Soft Reveal para controlar quando e a quem mostras o teu rosto. Começa com fotos desfocadas e revela progressivamente apenas a pessoas em quem confias.

O Modo Invisível (Premium) permite-te navegar sem aparecer no discovery de outros. O bloqueio de contactos usa hash criptográfico — nunca guardamos os teus contactos em texto simples.

Revê regularmente as tuas definições de privacidade em "Privacidade" no teu perfil. Podes apagar a tua conta e todos os dados a qualquer momento.`
  },
  {
    icon:'💜', title:'O que é o poliamor?', time:'7 min',
    content: `Poliamor é a prática de manter múltiplas relações românticas ou íntimas, consensuais e simultâneas, com o conhecimento de todas as pessoas envolvidas.

Existem várias estruturas: poliamor hierárquico (com uma relação "principal"), não-hierárquico (sem hierarquia entre parceiros), solo poly (sem relação principal nem cohabitação), entre outras.

A diferença fundamental face à infidelidade é o consentimento e a transparência — todas as pessoas sabem e concordam com a estrutura da relação.

Na Between Us, podes indicar a tua dinâmica relacional como "Poliamoroso/a" e usar a intenção "Poliamor" para encontrares pessoas com expectativas alinhadas.`
  },
  {
    icon:'✨', title:'Como criar um bom perfil', time:'4 min',
    content: `Um bom perfil não precisa de ser perfeito — precisa de ser honesto e claro.

Escreve uma bio que diga o que realmente procuras, não o que pensas que "deve" ser dito. Sê específico sobre as tuas intenções: queres conversa, encontro pontual, algo recorrente?

As fotos não precisam de mostrar o rosto de imediato — usa o Soft Reveal a teu favor. Uma foto desfocada bem escolhida transmite mais confiança do que nenhuma foto.

Preenche o Mapa de Limites com sinceridade. Isto não te vai "fechar portas" — vai trazer-te matches mais compatíveis e menos conversas desalinhadas.`
  },
  {
    icon:'🚪', title:'Como usar o Safe Exit', time:'3 min',
    content: `O Safe Exit é a tua ferramenta de saída segura em qualquer conversa.

Ao tocar no botão "Sair" dentro de uma sala privada, tens seis opções: arquivar a conversa, silenciar notificações, revogar acesso às tuas fotos privadas, bloquear o utilizador, reportar e sair, ou simplesmente sair.

Usa o Safe Exit sempre que sentires desconforto, pressão, ou que a conversa já não está alinhada com os teus limites. Não precisas de te justificar — a tua segurança e conforto vêm sempre primeiro.

Bloquear ou reportar um utilizador é sempre confidencial e não notifica a outra pessoa.`
  },
  {
    icon:'🤝', title:'Como funciona o consentimento contínuo', time:'5 min',
    content: `Na Between Us, o consentimento não é um "sim" único — é algo que se confirma em cada nova fase da interação.

O Consent Check pede confirmação explícita antes de avançar para fases mais íntimas: pedido de foto, revelação de rosto, videochamada, proposta de encontro. Cada fase exige aceitação de ambas as partes.

Podes recusar ou revogar consentimento a qualquer momento, mesmo depois de teres aceitado anteriormente. Isto é normal e está sempre disponível — não há pressão para "manter consistência" com decisões passadas.

Esta abordagem reduz mal-entendidos e protege todas as pessoas envolvidas.`
  },
]

export default function GuideScreen() {
  const [selected, setSelected] = useState(null)

  if (selected) {
    const a = ARTICLES[selected]
    return (
      <div style={{ padding:'60px 16px 40px' }}>
        <button onClick={() => setSelected(null)}
          style={{ background:'none', border:'none', color:colors.lavLight,
            fontSize:14, cursor:'pointer', marginBottom:20, padding:0 }}>
          ← Voltar ao guia
        </button>
        <div style={{ fontSize:40, marginBottom:12 }}>{a.icon}</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
          fontWeight:700, color:colors.white, marginBottom:8, lineHeight:1.3 }}>
          {a.title}
        </h1>
        <div style={{ color:colors.muted, fontSize:12, marginBottom:24 }}>
          ⏱ {a.time} de leitura
        </div>
        <div style={{ color:colors.lavLight, fontSize:15, lineHeight:1.8,
          whiteSpace:'pre-line' }}>
          {a.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'60px 16px 0' }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
        fontWeight:700, marginBottom:4,
        background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
        Between Guide
      </div>
      <div style={{ color:colors.muted, fontSize:13, fontStyle:'italic', marginBottom:20 }}>
        Aprende, explora com segurança.
      </div>
      {ARTICLES.map((a, i) => (
        <div key={i} onClick={() => setSelected(i)}
          style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
            borderRadius:16, padding:18, marginBottom:10, display:'flex',
            alignItems:'center', gap:16, cursor:'pointer' }}>
          <div style={{ fontSize:24, width:40, textAlign:'center' }}>{a.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:colors.white,
              marginBottom:3 }}>{a.title}</div>
            <div style={{ fontSize:11, color:colors.muted }}>⏱ {a.time} leitura</div>
          </div>
          <div style={{ color:colors.muted, fontSize:16 }}>›</div>
        </div>
      ))}
    </div>
  )
}
