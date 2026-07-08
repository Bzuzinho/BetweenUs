// 10.4/10.13 — reusable "contextual links back to the Guide" widget.
// Rule-based recommendations only (GuideRecommendationService, not AI) —
// this component just renders whatever /guide/contextual/:context returns.
// Named contexts match the server's GuideContext type exactly: AGREEMENT_MODE,
// PHOTO_PRIVACY, SAFETY_CHECKIN, PRIVATE_INTERESTS.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const C = {
  surface:'#102129', elevated:'#172C36', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.1)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
}

export default function GuideRecommendations({ context, title = 'Pode ser útil' }) {
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])

  useEffect(() => {
    let alive = true
    api.get(`/guide/contextual/${context}`)
      .then(r => { if (alive) setArticles(r.data.articles || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [context])

  if (articles.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        ◈ {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {articles.map(a => (
          <div key={a.id} onClick={() => navigate('/guide')} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          }}>
            <span style={{ fontSize: 16, color: C.primary }}>{a.icon || '○'}</span>
            <span style={{ fontSize: 13, color: C.text2, flex: 1 }}>{a.title}</span>
            <span style={{ color: C.muted, fontSize: 14 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
