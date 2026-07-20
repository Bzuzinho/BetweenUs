import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80', danger:'#F87171',
}

export default function ReferralsPage() {
  const navigate = useNavigate()
  const { t, formatNumber } = useI18n()
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    api.get('/referrals/me')
      .then(response => setData(response.data))
      .catch(() => setError(t('referrals.loadError')))
  }, [t])

  useEffect(() => { load() }, [load])

  const copy = async () => {
    if (!data?.link) return
    try {
      await navigator.clipboard.writeText(data.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(t('referrals.copyError'))
    }
  }

  if (!data && !error) return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>{t('referrals.loading')}</div>

  if (!data) return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', gap:14, alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
    <div style={{ color:C.danger, fontSize:13 }}>{error}</div>
    <button onClick={load} style={{ background:C.primary, border:'none', borderRadius:50, padding:'10px 18px', color:C.bg, fontWeight:600 }}>{t('referrals.retry')}</button>
  </div>

  const required = Number(data.progress?.required || 0)
  const current = Number(data.progress?.current || 0)
  const progressPct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0

  return <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
    <div style={{ maxWidth:420, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <button aria-label={t('common.back')} onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize:24, fontWeight:700, color:C.text, margin:0 }}>{t('referrals.title')}</h1>
      </div>

      {error && <div style={{ background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.3)', borderRadius:12, padding:'10px 14px', marginBottom:16, color:C.danger, fontSize:12 }}>{error}</div>}

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:10 }}>🎁</div>
        <p style={{ color:C.text2, fontSize:13, lineHeight:1.7, marginBottom:16 }}>
          {t('referrals.introBefore')} <strong style={{ color:C.text }}>{formatNumber(data.rule.referralsRequired)}</strong> {t('referrals.introMiddle')} <strong style={{ color:C.primary }}>{formatNumber(data.rule.rewardMonths)}</strong> {t('referrals.introAfter')}
        </p>
        <div style={{ background:C.bg, borderRadius:12, padding:'12px 14px', marginBottom:12, fontSize:12, color:C.muted, wordBreak:'break-all', lineHeight:1.5 }}>{data.link}</div>
        <button aria-label={t('referrals.shareLabel')} onClick={copy} style={{ width:'100%', background:copied?'rgba(74,222,128,.15)':C.primaryDim, border:`1px solid ${copied?C.success:C.primary}`, borderRadius:12, padding:12, fontSize:13, color:copied?C.success:C.primary, cursor:'pointer' }}>
          {copied ? `✓ ${t('referrals.copied')}` : `📋 ${t('referrals.copyLink')}`}
        </button>
      </div>

      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
          {[
            [data.totalReferred, t('referrals.invited')],
            [data.totalSubscribed, t('referrals.subscribed')],
            [data.rewardsGranted, t('referrals.rewards')],
          ].map(([value, label], index) => <div key={label} style={{ textAlign:'center', flex:1 }}>
            <div style={{ fontSize:22, fontWeight:700, color:index===2?C.primary:C.text }}>{formatNumber(value)}</div>
            <div style={{ fontSize:11, color:C.muted }}>{label}</div>
          </div>)}
        </div>
        <div style={{ fontSize:12, color:C.text2, marginBottom:6 }}>{t('referrals.progress')}: {formatNumber(current)}/{formatNumber(required)}</div>
        <div style={{ background:C.bg, borderRadius:8, height:8, overflow:'hidden' }}>
          <div style={{ width:`${progressPct}%`, height:'100%', background:C.primary, transition:'width .3s' }}/>
        </div>
      </div>
    </div>
  </div>
}
