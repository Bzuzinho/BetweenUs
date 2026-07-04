import { useState } from 'react'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.1)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
}

const ARTICLES = [
  { id:1, cat:'Casais',       icon:'◎', title:'Como definir limites em casal',                 desc:'Antes de explorar juntos, alinhem expectativas e limites claros.' },
  { id:2, cat:'Comunicação',  icon:'○', title:'Como falar sobre interesses privados',           desc:'Abordar fetiches e interesses com respeito e abertura.' },
  { id:3, cat:'Privacidade',  icon:'◌', title:'Privacidade digital básica',                    desc:'Protege a tua identidade online. Passos simples e eficazes.' },
  { id:4, cat:'Consentimento',icon:'◈', title:'Consentimento em ligações adultas',             desc:'O consentimento é contínuo. Como reconhecê-lo e respeitá-lo.' },
  { id:5, cat:'Relações',     icon:'◑', title:'Relações abertas e comunicação',                desc:'O que diferencia uma relação aberta saudável de uma problemática.' },
  { id:6, cat:'Segurança',    icon:'⊙', title:'Segurança no primeiro encontro',                desc:'Cuidados práticos para encontros presenciais com pessoas novas.' },
  { id:7, cat:'Perfil',       icon:'○', title:'Como criar um perfil de confiança',             desc:'O que incluir, o que evitar, e como transmitir autenticidade.' },
  { id:8, cat:'Casais',       icon:'◎', title:'A terceira pessoa não é um acessório',          desc:'Como respeitar e incluir uma terceira pessoa de forma equilibrada.' },
]

const CATS = ['Todos','Casais','Comunicação','Privacidade','Consentimento','Relações','Segurança','Perfil']

export default function GuideScreen() {
  const [cat, setCat] = useState('Todos')
  const [open, setOpen] = useState(null)
  const filtered = cat === 'Todos' ? ARTICLES : ARTICLES.filter(a => a.cat === cat)
  const article = ARTICLES.find(a => a.id === open)

  if (article) return (
    <div style={{ padding:'calc(20px + env(safe-area-inset-top)) 16px 32px', maxWidth:480, margin:'0 auto' }}>
      <button onClick={() => setOpen(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:20 }}>
        &larr;
      </button>
      <div style={{ fontSize:11, color:C.primary, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>{article.cat}</div>
      <h1 style={{ fontSize:22, fontWeight:500, color:C.text, marginBottom:16, lineHeight:1.4 }}>{article.title}</h1>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
        <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:0 }}>{article.desc}</p>
        <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, marginTop:16 }}>
          Este artigo está em construção. O Between Guide cresce com a comunidade — cada artigo é revisto antes de ser publicado.
        </p>
        <div style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          Between Guide — conteúdo educativo para adultos
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding:'calc(16px + env(safe-area-inset-top)) 16px 0', maxWidth:480, margin:'0 auto' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:'0 0 4px' }}>Between Guide</h1>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>Conteúdo educativo sobre privacidade, consentimento e ligações adultas.</p>
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            flexShrink:0, background: cat===c ? C.primaryDim : C.surface,
            border:`1px solid ${cat===c ? C.primary : C.border}`,
            borderRadius:20, padding:'7px 14px', fontSize:13,
            color:cat===c ? C.primary : C.muted, cursor:'pointer', minHeight:36, whiteSpace:'nowrap',
          }}>{c}</button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(a => (
          <div key={a.id} onClick={() => setOpen(a.id)} style={{
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
            padding:16, cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start',
          }}>
            <div style={{ width:40, height:40, borderRadius:12, background:C.elevated, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:C.primary, flexShrink:0 }}>
              {a.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>{a.cat}</div>
              <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:4, lineHeight:1.4 }}>{a.title}</div>
              <div style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{a.desc}</div>
            </div>
            <span style={{ color:C.muted, fontSize:18, flexShrink:0, marginTop:2 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
