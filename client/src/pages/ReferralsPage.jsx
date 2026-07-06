import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3', success:'#4ADE80',
}

export default function ReferralsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/referrals/me').then(r => setData(r.data)).catch(() => {})
  }, [])

  const copy = () => {
    if (!data?.link) return
    navigator.clipboard.writeText(data.link).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!data) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.muted, fontSize:13 }}>A carregar...</div>
    </div>
  )

  const progressPct = Math.min(100, Math.round((data.progress.current / data.progress.required) * 100))

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')} style={{ background:'none', border:'none', color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.text }}>Convidar amigos</h1>
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🎁</div>
          <p style={{ color:C.text2, fontSize:13, lineHeight:1.6, marginBottom:16 }}>
            Por cada <strong style={{ color:C.text }}>{data.rule.referralsRequired}</strong> pessoas que convidares e que subscrevam,
            ganhas <strong style={{ color:C.primary }}>{data.rule.rewardMonths} meses</strong> premium — ou, se já fores premium, ficas isento de pagar esses meses.
          </p>

          <div style={{ background:C.bg, borderRadius:12, padding:'12px 14px', marginBottom:12,
            fontSize:12, color:C.muted, wordBreak:'break-all', lineHeight:1.5 }}>
            {data.link}
          </div>
          <button onClick={copy} style={{ width:'100%', background: copied ? 'rgba(74,222,128,0.15)' : C.primaryDim,
            border:`1px solid ${copied ? C.success : C.primary}`, borderRadius:12, padding:12, fontSize:13,
            color: copied ? C.success : C.primary, cursor:'pointer' }}>
            {copied ? '✓ Copiado!' : '📋 Copiar link de convite'}
          </button>
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:22, fontWeight:700, color:C.text }}>{data.totalReferred}</div>
              <div style={{ fontSize:11, color:C.muted }}>Convidados</div>
            </div>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:22, fontWeight:700, color:C.text }}>{data.totalSubscribed}</div>
              <div style={{ fontSize:11, color:C.muted }}>Subscreveram</div>
            </div>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:22, fontWeight:700, color:C.primary }}>{data.rewardsGranted}</div>
              <div style={{ fontSize:11, color:C.muted }}>Recompensas</div>
            </div>
          </div>

          <div style={{ fontSize:12, color:C.text2, marginBottom:6 }}>
            Progresso para a próxima recompensa: {data.progress.current}/{data.progress.required}
          </div>
          <div style={{ background:C.bg, borderRadius:8, height:8, overflow:'hidden' }}>
            <div style={{ width:`${progressPct}%`, height:'100%', background:C.primary, transition:'width 0.3s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
