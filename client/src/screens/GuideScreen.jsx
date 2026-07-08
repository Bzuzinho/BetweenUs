import { useState, useEffect } from 'react'
import api from '../lib/api'
import EventsScreen from './EventsScreen'
import CirclesScreen from './CirclesScreen'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.1)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
}

// 10.2 — matches the server's controlled GuideCategory enum exactly (was
// free-text Portuguese before Sprint 10). Label map is display-only; the
// value sent to/received from the API is always the enum key.
const CATEGORY_LABELS = {
  CONSENT: 'Consentimento', COUPLES: 'Casais', OPEN_RELATIONSHIPS: 'Relações abertas',
  POLYAMORY: 'Poliamor', PRIVACY: 'Privacidade', SAFETY: 'Segurança',
  PROFILES: 'Perfil', FIRST_MEETINGS: 'Primeiros encontros', PRIVATE_INTERESTS: 'Interesses privados',
}

// Fallback articles shown before any are created in the admin — same
// spirit as before, updated to the new category keys.
const FALLBACK = [
  { id:'f1', slug:'f1', category:'PRIVACY',   icon:'◌', title:'Privacidade digital básica',        summary:'Protege a tua identidade online. Passos simples.' },
  { id:'f2', slug:'f2', category:'CONSENT',   icon:'◈', title:'Consentimento em ligações adultas',  summary:'O consentimento é contínuo. Como reconhecê-lo.' },
  { id:'f3', slug:'f3', category:'COUPLES',   icon:'◎', title:'Como definir limites em casal',      summary:'Antes de explorar juntos, alinhem expectativas.' },
  { id:'f4', slug:'f4', category:'PRIVATE_INTERESTS', icon:'○', title:'Como falar sobre interesses privados', summary:'Abordar fetiches com respeito e abertura.' },
  { id:'f5', slug:'f5', category:'FIRST_MEETINGS', icon:'⊙', title:'Segurança no primeiro encontro', summary:'Cuidados práticos para encontros presenciais.' },
  { id:'f6', slug:'f6', category:'COUPLES',   icon:'◎', title:'A terceira pessoa não é um acessório', summary:'Como respeitar e incluir uma terceira pessoa.' },
]

function GuideArticles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('Todos')
  const [openSlug, setOpenSlug] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    api.get('/guide')
      .then(r => setArticles(r.data.articles?.length ? r.data.articles : FALLBACK))
      .catch(() => setArticles(FALLBACK))
      .finally(() => setLoading(false))
  }, [])

  // 10.1 — the list endpoint deliberately omits `body`; the real article
  // content is only ever fetched here, on open, via the slug detail
  // route. (Previously this screen just reused the already-fetched list
  // item, so no article body was ever actually shown.)
  useEffect(() => {
    if (!openSlug) { setDetail(null); return }
    const fallback = FALLBACK.find(a => a.slug === openSlug)
    if (fallback) { setDetail(fallback); return }

    setDetailLoading(true)
    api.get(`/guide/${openSlug}`)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(articles.find(a => a.slug === openSlug) || null))
      .finally(() => setDetailLoading(false))
  }, [openSlug])

  const cats = ['Todos', ...new Set(articles.map(a => CATEGORY_LABELS[a.category] || a.category))]
  const filtered = cat === 'Todos' ? articles : articles.filter(a => (CATEGORY_LABELS[a.category] || a.category) === cat)

  if (openSlug) return (
    <div>
      <button onClick={() => setOpenSlug(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:20 }}>
        ←
      </button>

      {detailLoading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>A carregar…</div>}

      {detail && (
        <>
          <div style={{ fontSize:11, color:C.primary, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
            {CATEGORY_LABELS[detail.category] || detail.category}
            {detail.readingTime ? ` · ${detail.readingTime} min de leitura` : ''}
          </div>
          <h1 style={{ fontSize:22, fontWeight:500, color:C.text, marginBottom:20, lineHeight:1.4 }}>
            {detail.icon} {detail.title}
          </h1>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
            {detail.body ? (
              <div style={{ color:C.text2, fontSize:15, lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                {detail.body}
              </div>
            ) : (
              <>
                <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:'0 0 16px' }}>{detail.summary}</p>
                <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:0 }}>
                  Este artigo está a ser preparado. O Between Guide cresce com a comunidade — cada artigo é revisto pela nossa equipa antes de ser publicado.
                </p>
              </>
            )}
            <div style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
              Between Guide — conteúdo educativo para adultos
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div>
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
          <div key={a.id} onClick={() => setOpenSlug(a.slug || a.id)} style={{
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
            padding:16, cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start',
          }}>
            <div style={{ width:42, height:42, borderRadius:12, background:C.elevated, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:C.primary, flexShrink:0 }}>
              {a.icon || '○'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>{CATEGORY_LABELS[a.category] || a.category}</div>
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

// 10.13 — Guide, Events and Circles share one bottom-nav slot ("Guia") as
// a single growth/community surface, via a segmented control rather than
// three separate nav items — keeps the 5-item bottom nav from growing to
// 7 while still giving each surface its own discrete card language.
const SECTIONS = [
  { key:'guide',   label:'Guia' },
  { key:'events',  label:'Eventos' },
  { key:'circles', label:'Circles' },
]

export default function GuideScreen() {
  const [section, setSection] = useState('guide')

  return (
    <div style={{ padding:'calc(16px + env(safe-area-inset-top)) 16px 0', maxWidth:480, margin:'0 auto' }}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:'0 0 4px' }}>Between Guide</h1>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>Conteúdo, eventos e comunidades para ligações adultas privadas e seguras.</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:18, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:4 }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{
            flex:1, background: section===s.key ? C.primaryDim : 'transparent',
            border: section===s.key ? `1px solid ${C.primary}` : '1px solid transparent',
            borderRadius:8, padding:'8px 0', fontSize:13, fontWeight:500,
            color: section===s.key ? C.primary : C.muted, cursor:'pointer',
          }}>{s.label}</button>
        ))}
      </div>

      {section === 'guide' && <GuideArticles />}
      {section === 'events' && <EventsScreen />}
      {section === 'circles' && <CirclesScreen />}
    </div>
  )
}
