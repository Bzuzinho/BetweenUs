import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const C = {
  bg:'#0A141A', surface:'#102129', elevated:'#172C36',
  border:'#1E3340', input:'#0F1E26',
  primary:'#B8A7FF', primaryDim:'rgba(184,167,255,0.12)',
  text:'#F5F7FA', text2:'#AAB6C2', muted:'#7E8FA3',
  success:'#4ADE80', successDim:'rgba(74,222,128,0.1)',
  warning:'#FBBF24', danger:'#F87171', dangerDim:'rgba(248,113,113,0.1)',
}

export default function ContactsBlockPage() {
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/contacts/blocked/count')
      .then(r => setCount(r.data.count))
      .catch(() => {})
  }, [])

  const showMsg = (text, isError = false) => {
    if (isError) setError(text)
    else setMsg(text)
    setTimeout(() => { setMsg(''); setError('') }, 3000)
  }

  const handleManualBlock = async () => {
    const lines = input.trim().split('\n').filter(l => l.trim())
    if (!lines.length) return setError('Introduz pelo menos um email ou telefone.')

    setLoading(true)
    try {
      const contacts = lines.map(line => {
        const val = line.trim()
        const isEmail = val.includes('@')
        return { type: isEmail ? 'email' : 'phone', value: val }
      })

      const res = await api.post('/contacts/block', { contacts })
      setCount(c => c + res.data.blocked)
      setInput('')
      showMsg(`✓ ${res.data.blocked} contacto(s) bloqueado(s). Dados não guardados.`)
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao bloquear.', true)
    } finally { setLoading(false) }
  }

  const handleClear = async () => {
    setLoading(true)
    try {
      await api.delete('/contacts/blocked')
      setCount(0)
      showMsg('Lista de bloqueios limpa.')
    } catch {
      showMsg('Erro ao limpar.', true)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')}
            style={{ background:'none', border:'none',
              color:C.text2, fontSize:20, cursor:'pointer' }}>←</button>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
              fontWeight:700, color:C.text }}>Bloqueio de Contactos</h1>
            <p style={{ color:C.muted, fontSize:12 }}>
              {count} contacto(s) bloqueado(s)
            </p>
          </div>
        </div>

        {/* How it works */}
        <div style={{ background:'rgba(201,149,107,0.08)',
          border:'1px solid rgba(201,149,107,0.2)',
          borderRadius:16, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, color:C.primary,
            fontWeight:600, marginBottom:8 }}>🔒 Como funciona</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>
            • Introduz emails ou telefones de pessoas que não queres que te vejam<br/>
            • Os dados são convertidos em código hash — nunca guardamos os originais<br/>
            • Essas pessoas não aparecem no teu feed, e tu não apareces no delas<br/>
            • Nenhuma das partes sabe que a outra está na plataforma<br/>
            • Em conformidade com o RGPD
          </div>
        </div>

        {/* Feedback */}
        {msg && (
          <div style={{ background:'rgba(61,214,140,0.1)',
            border:`1px solid ${C.success}`, borderRadius:12,
            padding:'12px 16px', marginBottom:16,
            color:C.success, fontSize:13 }}>{msg}</div>
        )}
        {error && (
          <div style={{ background:'rgba(224,92,122,0.1)',
            border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
            padding:'12px 16px', marginBottom:16,
            color:'#F87171', fontSize:13 }}>{error}</div>
        )}

        {/* Manual input */}
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
          borderRadius:20, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:13, color:C.text2,
            fontWeight:600, marginBottom:12 }}>
            Introduzir emails ou telefones manualmente
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'exemplo@email.com\n+351912345678\noutro@email.com'}
            rows={5}
            style={{ width:'100%', background:C.bgInput,
              border:`1.5px solid ${C.border}`, borderRadius:14,
              padding:'13px 16px', color:C.text, fontSize:13,
              outline:'none', resize:'none', fontFamily:'monospace',
              boxSizing:'border-box', marginBottom:12 }}
          />
          <p style={{ color:C.muted, fontSize:11, marginBottom:14, lineHeight:1.5 }}>
            Um por linha. Aceita emails e telefones (com ou sem prefixo internacional).
          </p>
          <button onClick={handleManualBlock} disabled={loading || !input.trim()}
            style={{ width:'100%',
              background:`linear-gradient(135deg,${C.primary},${C.primaryDim})`,
              border:'none', borderRadius:50, padding:13, fontSize:14,
              fontWeight:600, color:'#1A0A2E', cursor:'pointer',
              opacity: loading || !input.trim() ? 0.6 : 1,
              fontFamily:'Inter,sans-serif' }}>
            {loading ? 'A bloquear...' : 'Bloquear contactos'}
          </button>
        </div>

        {/* Stats */}
        {count > 0 && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:16, padding:18, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center',
              justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:28, fontWeight:700, color:C.primary,
                  fontFamily:"'Playfair Display',serif" }}>{count}</div>
                <div style={{ fontSize:12, color:C.muted }}>
                  contacto(s) na lista de bloqueio
                </div>
              </div>
              <button onClick={handleClear} disabled={loading}
                style={{ background:'none',
                  border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
                  padding:'8px 16px', color:'#F87171', cursor:'pointer',
                  fontSize:12, fontFamily:'Inter,sans-serif' }}>
                Limpar tudo
              </button>
            </div>
          </div>
        )}

        {/* GDPR note */}
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
          borderRadius:14, padding:14 }}>
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>
            <strong style={{ color:C.text2 }}>🇪🇺 RGPD</strong> — Os contactos
            introduzidos são imediatamente convertidos em hash SHA-256 e os valores
            originais são descartados. Não guardamos emails nem telefones.
            Podes remover a lista a qualquer momento.
          </div>
        </div>
      </div>
    </div>
  )
}
