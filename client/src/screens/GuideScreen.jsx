import { useState, useEffect } from 'react'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.1)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
}

const CATS = ['Todos','Casais','Comunicação','Privacidade','Consentimento','Relações','Segurança','Perfil','Outro']

// Fallback articles shown before any are created in the admin
const FALLBACK = [
  { id:'f1', category:'Privacidade',   icon:'◌', title:'Privacidade digital básica',        summary:'Protege a tua identidade online. Passos simples.' },
  { id:'f2', category:'Consentimento', icon:'◈', title:'Consentimento em ligações adultas',  summary:'O consentimento é contínuo. Como reconhecê-lo.' },
  { id:'f3', category:'Casais',        icon:'◎', title:'Como definir limites em casal',      summary:'Antes de explorar juntos, alinhem expectativas.' },
  { id:'f4', category:'Comunicação',   icon:'○', title:'Como falar sobre interesses privados', summary:'Abordar fetiches com respeito e abertura.' },
  { id:'f5', category:'Segurança',     icon:'⊙', title:'Segurança no primeiro encontro',     summary:'Cuidados práticos para encontros presenciais.' },
  { id:'f6', category:'Casais',        icon:'◎', title:'A terceira pessoa não é um acessório', summary:'Como respeitar e incluir uma terceira pessoa.' },
]

export default function GuideScreen() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('Todos')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    api.get('/guide')
      .then(r => setArticles(r.data.articles?.length ? r.data.articles : FALLBACK))
      .catch(() => setArticles(FALLBACK))
      .finally(() => setLoading(false))
  }, [])

  const cats = ['Todos', ...new Set(articles.map(a => a.category))]
  const filtered = cat === 'Todos' ? articles : articles.filter(a => a.category === cat)
  const article = articles.find(a => a.id === open)

  if (article) return (
    <div style={{ padding:'calc(20px + env(safe-area-inset-top)) 16px 32px', maxWidth:480, margin:'0 auto' }}>
      <button onClick={() => setOpen(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:20 }}>
        ←
      </button>
      <div style={{ fontSize:11, color:C.primary, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
        {article.category}
      </div>
      <h1 style={{ fontSize:22, fontWeight:500, color:C.text, marginBottom:20, lineHeight:1.4 }}>
        {article.icon} {article.title}
      </h1>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
        {article.body ? (
          <div style={{ color:C.text2, fontSize:15, lineHeight:1.8, whiteSpace:'pre-wrap' }}>
            {article.body}
          </div>
        ) : (
          <>
            <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:'0 0 16px' }}>{article.summary}</p>
            <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:0 }}>
              Este artigo está a ser preparado. O Between Guide cresce com a comunidade — cada artigo é revisto pela nossa equipa antes de ser publicado.
            </p>
          </>
        )}
        <div style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          Between Guide — conteúdo educativo para adultos
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding:'calc(16px + env(safe-area-inset-top)) 16px 0', maxWidth:480, margin:'0 auto' }}>
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:'0 0 4px' }}>Between Guide</h1>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>Conteúdo educativo sobre privacidade, consentimento e ligações adultas.</p>
      </div>

      {/* Category filter — wraps, no scroll */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            background: cat===c ? C.primaryDim : C.surface,
            border:`1px solid ${cat===c ? C.primary : C.border}`,
            borderRadius:20, padding:'7px 14px',
            fontSize:13, color:cat===c ? C.primary : C.muted,
            cursor:'pointer',
          }}>{c}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>A carregar…</div>}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(a => (
          <div key={a.id} onClick={() => setOpen(a.id)} style={{
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
            padding:16, cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start',
          }}>
            <div style={{ width:42, height:42, borderRadius:12, background:C.elevated, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:C.primary, flexShrink:0 }}>
              {a.icon || '○'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>{a.category}</div>
              <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:4, lineHeight:1.4 }}>{a.title}</div>
              {a.summary && <div style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{a.summary}</div>}
            </div>
            <span style={{ color:C.muted, fontSize:18, flexShrink:0, marginTop:2 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
