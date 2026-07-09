// BETA.2 (FASE C) — Profile Switcher.
//
// Lets a user with more than one profile context (their own Individual
// Profile, plus any Shared Profile — COUPLE/GROUP — they belong to) pick
// which one they're currently acting as. Backed by GET /auth/me's
// availableProfileContexts/activeProfileContext and
// POST /auth/active-profile (activeProfileContextService.ts on the
// server) — this component is purely a thin UI over that, no client-side
// resolution logic of its own.
//
// Renders nothing when there's nothing to switch between (the common
// case today: most users only have their own Individual Profile), so it's
// safe to mount unconditionally in AppShell.
import { useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3',
}

const TYPE_LABEL = { INDIVIDUAL: 'Individual', COUPLE: 'Casal', GROUP: 'Grupo' }

export default function ProfileSwitcher() {
  const { user, refreshUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const contexts = user?.availableProfileContexts || []
  const active = user?.activeProfileContext

  if (contexts.length <= 1) return null

  const handleSwitch = async (profileId) => {
    if (profileId === active?.profileId) { setOpen(false); return }
    setSwitching(true)
    try {
      await api.post('/auth/active-profile', { profileId })
      await refreshUser()
    } catch {
      // best-effort — leave the menu open so the user can retry
    } finally {
      setSwitching(false)
      setOpen(false)
    }
  }

  return (
    <div style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        style={{
          display:'flex', alignItems:'center', gap:8,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
          padding:'8px 12px', color:C.text, fontSize:13, cursor:'pointer'
        }}
      >
        <span style={{ color:C.muted, fontSize:11 }}>{TYPE_LABEL[active?.type] || ''}</span>
        <span style={{ fontWeight:600 }}>{active?.displayName || 'Perfil'}</span>
        <span style={{ color:C.muted, fontSize:10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:220, zIndex:50,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden'
        }}>
          {contexts.map(ctx => (
            <button
              key={ctx.profileId}
              onClick={() => handleSwitch(ctx.profileId)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'flex-start', width:'100%',
                background: ctx.profileId === active?.profileId ? 'rgba(184,167,255,0.12)' : 'transparent',
                border:'none', borderBottom:`1px solid ${C.border}`, padding:'10px 12px',
                color:C.text, fontSize:13, cursor:'pointer', textAlign:'left'
              }}
            >
              <span style={{ fontWeight:600 }}>{ctx.displayName}</span>
              <span style={{ color:C.muted, fontSize:11 }}>
                {TYPE_LABEL[ctx.type] || ctx.type} · {ctx.role === 'OWNER' ? 'Dono' : 'Membro'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
