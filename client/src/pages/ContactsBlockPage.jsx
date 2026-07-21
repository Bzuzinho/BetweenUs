import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', danger:'#F87171',
}

export default function ContactsBlockPage() {
  const navigate = useNavigate()
  const { t, formatNumber } = useI18n()
  const [count, setCount] = useState(0)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/contacts/blocked/count')
      .then(response => setCount(response.data.count))
      .catch(() => {})
  }, [])

  const showMsg = (text, isError = false) => {
    if (isError) {
      setMsg('')
      setError(text)
    } else {
      setError('')
      setMsg(text)
    }
    setTimeout(() => { setMsg(''); setError('') }, 3000)
  }

  const handleManualBlock = async () => {
    const lines = input.trim().split('\n').filter(line => line.trim())
    if (!lines.length) return showMsg(t('contactsBlock.required'), true)

    setLoading(true)
    try {
      const contacts = lines.map(line => {
        const value = line.trim()
        return { type:value.includes('@') ? 'email' : 'phone', value }
      })
      const response = await api.post('/contacts/block', { contacts })
      const blocked = response.data.blocked || 0
      setCount(current => current + blocked)
      setInput('')
      showMsg(`✓ ${formatNumber(blocked)} ${t('contactsBlock.blocked')}`)
    } catch {
      showMsg(t('contactsBlock.blockError'), true)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    setLoading(true)
    try {
      await api.delete('/contacts/blocked')
      setCount(0)
      showMsg(t('contactsBlock.cleared'))
    } catch {
      showMsg(t('contactsBlock.clearError'), true)
    } finally {
      setLoading(false)
    }
  }

  const countLabel = count === 1 ? t('contactsBlock.countSingular') : t('contactsBlock.countPlural')
  const steps = t('contactsBlock.how', [])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')} aria-label={t('common.back')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.text, margin:0 }}>{t('contactsBlock.title')}</h1>
            <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>{formatNumber(count)} {countLabel}</p>
          </div>
        </div>

        <div style={{ background:'rgba(184,167,255,0.08)', border:'1px solid rgba(184,167,255,0.2)', borderRadius:16, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, color:C.primary, fontWeight:600, marginBottom:8 }}>🔒 {t('contactsBlock.howTitle')}</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>
            {steps.map((step, index) => <div key={index}>• {step}</div>)}
          </div>
        </div>

        {msg && <div style={{ background:'rgba(74,222,128,0.1)', border:`1px solid ${C.success}`, borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.success, fontSize:13 }}>{msg}</div>}
        {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.danger, fontSize:13 }}>{error}</div>}

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:13, color:C.text2, fontWeight:600, marginBottom:12 }}>{t('contactsBlock.manualTitle')}</div>
          <textarea value={input} onChange={event => setInput(event.target.value)} placeholder={t('contactsBlock.placeholder')} rows={5}
            style={{ width:'100%', background:C.input, border:`1.5px solid ${C.border}`, borderRadius:14, padding:'13px 16px', color:C.text, fontSize:13, outline:'none', resize:'none', fontFamily:'monospace', boxSizing:'border-box', marginBottom:12 }} />
          <p style={{ color:C.muted, fontSize:11, marginBottom:14, lineHeight:1.5 }}>{t('contactsBlock.helper')}</p>
          <button onClick={handleManualBlock} disabled={loading || !input.trim()}
            style={{ width:'100%', background:C.primary, border:'none', borderRadius:50, padding:13, fontSize:14, fontWeight:600, color:'#0A141A', cursor:'pointer', opacity:loading || !input.trim() ? 0.6 : 1 }}>
            {loading ? t('contactsBlock.blocking') : t('contactsBlock.block')}
          </button>
        </div>

        {count > 0 && <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div><div style={{ fontSize:28, fontWeight:700, color:C.primary }}>{formatNumber(count)}</div><div style={{ fontSize:12, color:C.muted }}>{t('contactsBlock.listCount')}</div></div>
            <button onClick={handleClear} disabled={loading} style={{ background:'none', border:'1px solid rgba(248,113,113,0.3)', borderRadius:12, padding:'8px 16px', color:C.danger, cursor:'pointer', fontSize:12 }}>{t('contactsBlock.clear')}</button>
          </div>
        </div>}

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}><strong style={{ color:C.text2 }}>🇪🇺 {t('contactsBlock.gdprTitle')}</strong> — {t('contactsBlock.gdpr')}</div>
        </div>
      </div>
    </div>
  )
}
