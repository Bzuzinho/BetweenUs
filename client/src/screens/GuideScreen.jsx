const colors = {
  bg:'#0E0818', bgCard:'#1A1028', plum:'#2D1B4E',
  accent:'#C9956B', white:'#FAF7F5', muted:'#7A6E88'
}

const articles = [
  { icon:'💑', title:'Como definir limites em casal', time:'5 min' },
  { icon:'🔒', title:'Como falar sobre fetiches sem pressão', time:'4 min' },
  { icon:'🤝', title:'Segurança em encontros presenciais', time:'6 min' },
  { icon:'📱', title:'Privacidade digital', time:'3 min' },
  { icon:'💜', title:'O que é o poliamor?', time:'7 min' },
  { icon:'✨', title:'Como criar um bom perfil', time:'4 min' },
]

export default function GuideScreen() {
  return (
    <div style={{ padding:'60px 16px 0' }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
        fontWeight:700, marginBottom:4,
        background:`linear-gradient(135deg,${colors.accent},#F2C4B8)`,
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
        Between Guide
      </div>
      <div style={{ color:colors.muted, fontSize:13, fontStyle:'italic',
        marginBottom:20 }}>Aprende, explora com segurança.</div>
      {articles.map((a,i) => (
        <div key={i} style={{ background:colors.bgCard,
          border:`1px solid ${colors.plum}`, borderRadius:16,
          padding:18, marginBottom:10, display:'flex',
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
