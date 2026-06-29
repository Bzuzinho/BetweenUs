import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const colors = {
  bg:'#0E0818', bgCard:'#1A1028', bgInput:'#231535', plum:'#2D1B4E',
  accent:'#C9956B', rose:'#F2C4B8', lavLight:'#B8A9D4',
  white:'#FAF7F5', muted:'#7A6E88', green:'#3DD68C'
}

const GESTURES = ['✌️ Paz', '👍 Polegar', '🤙 Shaka', '☝️ Um dedo']

export default function VerificationPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  // Pick a random gesture for liveness check
  const [gesture] = useState(() =>
    GESTURES[Math.floor(Math.random() * GESTURES.length)])

  useEffect(() => {
    api.get('/verifications/me')
      .then(r => setStatus(r.data.status))
      .catch(() => setStatus('NONE'))
      .finally(() => setLoading(false))
  }, [])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Ficheiro demasiado grande. Máximo 10MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setPreview({ file, url: ev.target?.result })
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!preview) return
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('selfie', preview.file)
      const res = await api.post('/verifications/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setStatus(res.data.status)
      setPreview(null)
      setMsg(res.data.message)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar selfie.')
    } finally { setUploading(false) }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:colors.bg, display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:colors.accent, fontFamily:"'Playfair Display',serif",
        fontSize:20, fontStyle:'italic' }}>A carregar...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:colors.bg, padding:'60px 20px 40px' }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => navigate('/profile')}
            style={{ background:'none', border:'none',
              color:colors.lavLight, fontSize:20, cursor:'pointer' }}>←</button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
            fontWeight:700, color:colors.white }}>Verificar Perfil</h1>
        </div>

        {/* Status: APPROVED */}
        {status === 'APPROVED' && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:70, marginBottom:20 }}>✅</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24,
              color:colors.white, marginBottom:12 }}>Perfil Verificado!</div>
            <div style={{ background:'rgba(61,214,140,0.1)',
              border:`1px solid ${colors.green}`, borderRadius:20,
              padding:'10px 20px', display:'inline-block',
              color:colors.green, fontSize:14, fontWeight:600,
              marginBottom:20 }}>✓ Verificado</div>
            <p style={{ color:colors.muted, fontSize:13, lineHeight:1.6 }}>
              O teu perfil tem o selo de verificado. Isto aumenta a confiança
              de outros utilizadores e melhora o teu Between Score.
            </p>
          </div>
        )}

        {/* Status: PENDING */}
        {status === 'PENDING' && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:70, marginBottom:20 }}>⏳</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
              color:colors.white, marginBottom:12 }}>Em revisão</div>
            <p style={{ color:colors.muted, fontSize:13, lineHeight:1.6 }}>
              A tua selfie foi recebida. A equipa Between Us irá rever
              em até 24 horas. Receberás uma notificação quando estiver pronto.
            </p>
          </div>
        )}

        {/* Status: REJECTED */}
        {status === 'REJECTED' && (
          <div style={{ background:'rgba(224,92,122,0.1)',
            border:'1px solid rgba(224,92,122,0.3)',
            borderRadius:20, padding:20, marginBottom:20, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
            <div style={{ color:'#E05C7A', fontWeight:600,
              fontSize:15, marginBottom:8 }}>Verificação recusada</div>
            <p style={{ color:colors.muted, fontSize:13, lineHeight:1.5 }}>
              A selfie não foi aceite. Tenta novamente com uma foto mais clara
              do teu rosto e com o gesto pedido.
            </p>
          </div>
        )}

        {/* Form: NONE or REJECTED */}
        {(status === 'NONE' || status === 'REJECTED') && (
          <>
            {/* How it works */}
            <div style={{ background:'rgba(201,149,107,0.08)',
              border:'1px solid rgba(201,149,107,0.2)',
              borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, color:colors.accent,
                fontWeight:600, marginBottom:10 }}>Como funciona</div>
              <div style={{ fontSize:12, color:colors.muted, lineHeight:1.8 }}>
                1. Tira uma selfie com o gesto pedido em baixo<br/>
                2. Enviamos para revisão manual pela equipa<br/>
                3. Recebes o selo ✓ Verificado em até 24h<br/>
                4. O teu nome real nunca é partilhado publicamente
              </div>
            </div>

            {/* Gesture challenge */}
            <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
              borderRadius:20, padding:20, marginBottom:20, textAlign:'center' }}>
              <div style={{ fontSize:13, color:colors.lavLight,
                marginBottom:8 }}>Tira uma selfie a fazer este gesto:</div>
              <div style={{ fontSize:60, marginBottom:8 }}>
                {gesture.split(' ')[0]}
              </div>
              <div style={{ fontSize:18, color:colors.white,
                fontWeight:600 }}>{gesture.split(' ').slice(1).join(' ')}</div>
              <div style={{ fontSize:11, color:colors.muted, marginTop:8 }}>
                Garante que o teu rosto e o gesto são claramente visíveis
              </div>
            </div>

            {/* Feedback */}
            {msg && (
              <div style={{ background:'rgba(61,214,140,0.1)',
                border:`1px solid ${colors.green}`, borderRadius:12,
                padding:'12px 16px', marginBottom:16,
                color:colors.green, fontSize:13 }}>{msg}</div>
            )}
            {error && (
              <div style={{ background:'rgba(224,92,122,0.1)',
                border:'1px solid rgba(224,92,122,0.3)', borderRadius:12,
                padding:'12px 16px', marginBottom:16,
                color:'#E05C7A', fontSize:13 }}>{error}</div>
            )}

            {/* Upload */}
            <div style={{ background:colors.bgCard, border:`1px solid ${colors.plum}`,
              borderRadius:20, padding:20 }}>
              {preview ? (
                <>
                  <div style={{ position:'relative', marginBottom:14 }}>
                    <img src={preview.url} alt="preview"
                      style={{ width:'100%', height:220,
                        objectFit:'cover', borderRadius:14 }} />
                    <button onClick={() => setPreview(null)}
                      style={{ position:'absolute', top:8, right:8,
                        background:'rgba(0,0,0,0.6)', border:'none',
                        borderRadius:'50%', width:30, height:30,
                        cursor:'pointer', color:'white', fontSize:14 }}>✕</button>
                  </div>
                  <button onClick={handleSubmit} disabled={uploading}
                    style={{ width:'100%',
                      background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                      border:'none', borderRadius:50, padding:14, fontSize:15,
                      fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                      opacity: uploading ? 0.7 : 1,
                      fontFamily:'Inter,sans-serif' }}>
                    {uploading ? 'A enviar...' : 'Enviar para verificação →'}
                  </button>
                </>
              ) : (
                <>
                  <div onClick={() => fileRef.current?.click()}
                    style={{ height:140, border:`2px dashed ${colors.plum}`,
                      borderRadius:14, display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      cursor:'pointer', gap:8, marginBottom:14 }}>
                    <span style={{ fontSize:40 }}>🤳</span>
                    <span style={{ color:colors.muted, fontSize:13 }}>
                      Toca para escolher a selfie
                    </span>
                  </div>
                  <input ref={fileRef} type="file"
                    accept="image/*" capture="user"
                    style={{ display:'none' }} onChange={handleFile} />
                  <button onClick={() => fileRef.current?.click()}
                    style={{ width:'100%',
                      background:`linear-gradient(135deg,${colors.accent},${colors.rose})`,
                      border:'none', borderRadius:50, padding:14, fontSize:15,
                      fontWeight:600, color:'#1A0A2E', cursor:'pointer',
                      fontFamily:'Inter,sans-serif' }}>
                    Tirar selfie 🤳
                  </button>
                </>
              )}
            </div>

            {/* Privacy note */}
            <div style={{ marginTop:16, padding:'0 4px' }}>
              <p style={{ color:colors.muted, fontSize:11, lineHeight:1.6,
                textAlign:'center' }}>
                🔒 A selfie é usada apenas para verificação manual e apagada
                após revisão. O teu nome real nunca é mostrado publicamente.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
