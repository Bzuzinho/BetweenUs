import { useState } from 'react'
import api from '../lib/api'

const colors = { bg:'#0E0818', bgCard:'#1A1028', plum:'#2D1B4E',
  accent:'#C9956B', white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C' }

export default function DebugPage() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const addResult = (label, data, ok) => {
    setResults(prev => [...prev, { label, data: JSON.stringify(data, null, 2), ok, time: new Date().toLocaleTimeString() }])
  }

  const testHealth = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/me').catch(() => null)
      const BACKEND = import.meta.env.VITE_API_URL || '/api'
      const health = await fetch(BACKEND.replace('/api', '/health'))
      const data = await health.json()
      addResult('Health Check', { backend: BACKEND, ...data }, true)
    } catch (err) {
      addResult('Health Check', { error: err.message }, false)
    }
    setLoading(false)
  }

  const testRegister = async () => {
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        email: `test-${Date.now()}@test.com`,
        password: 'test12345',
        dateOfBirth: '1990-01-01',
        termsAccepted: true
      })
      addResult('Register', res.data, true)
    } catch (err) {
      addResult('Register', {
        status: err.response?.status,
        error: err.response?.data || err.message,
        url: err.config?.url,
        baseURL: err.config?.baseURL
      }, false)
    }
    setLoading(false)
  }

  const row = (r, i) => (
    <div key={i} style={{ background: r.ok ? 'rgba(61,214,140,0.1)' : 'rgba(224,92,122,0.1)',
      border: `1px solid ${r.ok ? colors.green : '#E05C7A'}`,
      borderRadius:12, padding:14, marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ color: r.ok ? colors.green : '#E05C7A', fontWeight:600, fontSize:13 }}>
          {r.ok ? '✅' : '❌'} {r.label}
        </span>
        <span style={{ color:colors.muted, fontSize:11 }}>{r.time}</span>
      </div>
      <pre style={{ color:colors.white, fontSize:11, overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
        {r.data}
      </pre>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, padding:'40px 20px' }}>
      <div style={{ maxWidth:480, margin:'0 auto' }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", color:colors.accent,
          fontSize:24, marginBottom:8 }}>Between Us — Debug</h1>
        <p style={{ color:colors.muted, fontSize:12, marginBottom:24 }}>
          API: {import.meta.env.VITE_API_URL || '/api (proxy)'}
        </p>
        <div style={{ display:'flex', gap:10, marginBottom:24 }}>
          {[['Health', testHealth], ['Registar', testRegister]].map(([label, fn]) => (
            <button key={label} onClick={fn} disabled={loading}
              style={{ flex:1, background:`linear-gradient(135deg,${colors.accent},#F2C4B8)`,
                border:'none', borderRadius:50, padding:'12px', fontSize:13,
                fontWeight:600, color:'#1A0A2E', cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setResults([])}
          style={{ background:'none', border:`1px solid ${colors.plum}`, borderRadius:50,
            padding:'8px 20px', color:colors.muted, cursor:'pointer', marginBottom:20,
            fontSize:12, width:'100%' }}>
          Limpar resultados
        </button>
        {results.length === 0 && (
          <p style={{ color:colors.muted, textAlign:'center', fontSize:13 }}>
            Toca em "Health" ou "Registar" para testar
          </p>
        )}
        {results.map(row)}
      </div>
    </div>
  )
}
