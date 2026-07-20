import { useState, useEffect } from 'react'
import api from '../lib/api'
import EventsScreen from './EventsScreen'
import CirclesScreen from './CirclesScreen'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.1)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
}

function buildFallback(t) {
  return (t('guide.fallback', []) || []).map((item, index) => ({
    id:`f${index + 1}`, slug:`f${index + 1}`, category:item[0], icon:item[1], title:item[2], summary:item[3],
  }))
}

function GuideArticles() {
  const { t } = useI18n()
  const fallback = buildFallback(t)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('ALL')
  const [openSlug, setOpenSlug] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const categoryLabel = category => t(`guide.categories.${category}`, category)

  useEffect(() => {
    api.get('/guide')
      .then(r => setArticles(r.data.articles?.length ? r.data.articles : fallback))
      .catch(() => setArticles(fallback))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!openSlug) { setDetail(null); return }
    const fallbackArticle = fallback.find(a => a.slug === openSlug)
    if (fallbackArticle) { setDetail(fallbackArticle); return }

    setDetailLoading(true)
    api.get(`/guide/${openSlug}`)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(articles.find(a => a.slug === openSlug) || null))
      .finally(() => setDetailLoading(false))
  }, [openSlug])

  const categories = ['ALL', ...new Set(articles.map(a => a.category))]
  const filtered = cat === 'ALL' ? articles : articles.filter(a => a.category === cat)

  if (openSlug) return (
    <div>
      <button onClick={() => setOpenSlug(null)} aria-label={t('common.back')} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:'4px 0', marginBottom:20 }}>
        ←
      </button>

      {detailLoading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>{t('common.loading')}</div>}

      {detail && (
        <>
          <div style={{ fontSize:11, color:C.primary, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
            {categoryLabel(detail.category)}
            {detail.readingTime ? ` · ${detail.readingTime} ${t('guide.readingTime')}` : ''}
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
                <p style={{ color:C.text2, fontSize:15, lineHeight:1.7, margin:0 }}>{t('guide.preparing')}</p>
              </>
            )}
            <div style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
              {t('guide.footer')}
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        {categories.map(category => (
          <button key={category} onClick={() => setCat(category)} style={{
            background: cat===category ? C.primaryDim : C.surface,
            border:`1px solid ${cat===category ? C.primary : C.border}`,
            borderRadius:20, padding:'7px 14px',
            fontSize:13, color:cat===category ? C.primary : C.muted,
            cursor:'pointer',
          }}>{category === 'ALL' ? t('common.all') : categoryLabel(category)}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>{t('common.loading')}</div>}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(article => (
          <div key={article.id} onClick={() => setOpenSlug(article.slug || article.id)} style={{
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
            padding:16, cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start',
          }}>
            <div style={{ width:42, height:42, borderRadius:12, background:C.elevated, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:C.primary, flexShrink:0 }}>
              {article.icon || '○'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:4 }}>{categoryLabel(article.category)}</div>
              <div style={{ fontSize:15, fontWeight:500, color:C.text, marginBottom:4, lineHeight:1.4 }}>{article.title}</div>
              {article.summary && <div style={{ fontSize:13, color:C.text2, lineHeight:1.5 }}>{article.summary}</div>}
            </div>
            <span style={{ color:C.muted, fontSize:18, flexShrink:0, marginTop:2 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GuideScreen() {
  const { t } = useI18n()
  const [section, setSection] = useState('guide')
  const sections = [
    { key:'guide', label:t('guide.sections.guide') },
    { key:'events', label:t('guide.sections.events') },
    { key:'circles', label:t('guide.sections.circles') },
  ]

  return (
    <div style={{ padding:'calc(16px + env(safe-area-inset-top)) 16px 0', maxWidth:480, margin:'0 auto' }}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontSize:20, fontWeight:500, color:C.text, margin:'0 0 4px' }}>{t('guide.title')}</h1>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>{t('guide.subtitle')}</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:18, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:4 }}>
        {sections.map(item => (
          <button key={item.key} onClick={() => setSection(item.key)} style={{
            flex:1, background: section===item.key ? C.primaryDim : 'transparent',
            border: section===item.key ? `1px solid ${C.primary}` : '1px solid transparent',
            borderRadius:8, padding:'8px 0', fontSize:13, fontWeight:500,
            color: section===item.key ? C.primary : C.muted, cursor:'pointer',
          }}>{item.label}</button>
        ))}
      </div>

      {section === 'guide' && <GuideArticles />}
      {section === 'events' && <EventsScreen />}
      {section === 'circles' && <CirclesScreen />}
    </div>
  )
}
