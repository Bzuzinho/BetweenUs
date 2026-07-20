import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
}

const CONSENT_TYPE_BY_PAGE = { terms:'TERMS', privacy:'PRIVACY_POLICY' }
const VALID_PAGES = ['terms', 'privacy', 'cookies', 'safety']

export default function LegalPage() {
  const { page } = useParams()
  const navigate = useNavigate()
  const { language, t } = useI18n()
  const pageKey = VALID_PAGES.includes(page) ? page : 'terms'
  const translated = {
    title:t(`legal.pages.${pageKey}.title`),
    content:t(`legal.pages.${pageKey}.content`),
  }
  const [doc, setDoc] = useState(translated)

  useEffect(() => {
    const localDocument = {
      title:t(`legal.pages.${pageKey}.title`),
      content:t(`legal.pages.${pageKey}.content`),
    }
    setDoc(localDocument)

    const consentType = CONSENT_TYPE_BY_PAGE[pageKey]
    if (!consentType || language !== 'pt-PT') return

    api.get(`/legal/${consentType}`)
      .then(response => setDoc({
        title:response.data.title || localDocument.title,
        content:response.data.content || localDocument.content,
        version:response.data.version,
      }))
      .catch(() => {})
  }, [pageKey, language, t])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px' }}>
      <div style={{ maxWidth:650, margin:'0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:C.text2, fontSize:14, cursor:'pointer', marginBottom:24, padding:0 }}>
          ← {t('legal.back')}
        </button>
        <h1 style={{ fontSize:26, fontWeight:700, color:C.text, marginBottom:24 }}>{doc.title}</h1>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:28 }}>
          <div style={{ color:C.text2, fontSize:14, lineHeight:1.8, whiteSpace:'pre-line' }}>{doc.content}</div>
        </div>
      </div>
    </div>
  )
}
