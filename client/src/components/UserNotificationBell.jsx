import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const C = {
  surface: '#102129', border: '#1E3340',
  primary: '#B8A7FF', text: '#F5F7FA', text2: '#AAB6C2', muted: '#7E8FA3',
  danger: '#F87171',
}

export default function UserNotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [busyId, setBusyId] = useState(null)
  const ref = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.get('/notifications').then(r => setNotifs(r.data.notifications || [])).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifs.filter(n => !n.readAt).length

  const markRead = async id => {
    await api.put(`/notifications/${id}/read`).catch(() => {})
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date() } : n))
  }

  const parseData = n => { try { return n.data ? JSON.parse(n.data) : {} } catch { return {} } }

  const respond = async (n, accept) => {
    const data = parseData(n)
    if (!data.fromProfileId) return
    setBusyId(n.id)
    try {
      await api.post(`/matches/${accept ? 'accept' : 'reject'}/${data.fromProfileId}`)
      await markRead(n.id)
      if (accept) { setOpen(false); navigate('/matches') }
    } catch {
      // no-op — deixa a notificação visível para tentar de novo
    } finally {
      setBusyId(null)
    }
  }

  const onClickNotif = n => {
    markRead(n.id)
    const data = parseData(n)
    if (data.tab) { setOpen(false); navigate(`/${data.tab}`) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'relative', background: 'none',
        border: `1px solid ${unread > 0 ? 'rgba(184,167,255,0.4)' : C.border}`,
        borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        color: unread > 0 ? C.primary : C.text2, flexShrink: 0,
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            background: C.danger, color: '#fff',
            fontSize: 9, fontWeight: 700, borderRadius: 10,
            padding: '1px 5px', minWidth: 16, textAlign: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, width: 300, maxHeight: 420,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 500, color: C.text }}>
            Notificações
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 380 }}>
            {notifs.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>Sem notificações</div>
            )}
            {notifs.map(n => {
              const isRequest = n.type === 'connection_request'
              return (
                <div key={n.id} onClick={() => !isRequest && onClickNotif(n)} style={{
                  padding: '12px 14px', borderBottom: `1px solid ${C.border}`,
                  cursor: isRequest ? 'default' : 'pointer',
                  background: n.readAt ? 'transparent' : 'rgba(184,167,255,0.06)',
                }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{n.body}</div>
                  {isRequest && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button disabled={busyId === n.id} onClick={() => respond(n, true)} style={{
                        flex: 1, background: 'rgba(184,167,255,0.15)', border: `1px solid ${C.primary}`,
                        borderRadius: 10, padding: '8px 0', color: C.primary, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                      }}>Aceitar</button>
                      <button disabled={busyId === n.id} onClick={() => respond(n, false)} style={{
                        flex: 1, background: 'none', border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: '8px 0', color: C.muted, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                      }}>Recusar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
