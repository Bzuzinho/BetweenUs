// BETA.2 (FASE C) — Profile Switcher.
//
// The authenticated header always identifies the real account holder. Users
// who belong to a couple can open the dropdown and choose whether they are
// acting through their individual profile or the shared couple profile.
// Individual-only users see their individual profile without an unnecessary
// dropdown.
import { useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'

const C = {
  bg:'#0A141A', surface:'#102129', border:'#1E3340',
  primary:'#B8A7FF', text:'#F5F7FA', muted:'#7E8FA3',
}

const TYPE_KEY = {
  INDIVIDUAL: 'common.individualProfile',
  COUPLE: 'common.coupleProfile',
  GROUP: 'common.groupProfile',
}

const roleLabelKey = context => {
  if (context?.type === 'INDIVIDUAL') return 'profileSwitcher.userRole'
  return context?.role === 'OWNER'
    ? 'profileSwitcher.creatorPartnerRole'
    : 'profileSwitcher.partnerRole'
}

const firstAndLastName = value => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] || ''
  return `${parts[0]} ${parts[parts.length - 1]}`
}

export default function ProfileSwitcher() {
  const { user, refreshUser } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const contexts = user?.availableProfileContexts || []
  const active = user?.activeProfileContext || user?.individualProfile || null
  const canSwitchProfile = contexts.length > 1

  const realName = firstAndLastName(user?.accountName) || t('common.user')
  const activeTypeLabel = t(TYPE_KEY[active?.type] || 'common.individualProfile')
  const activeRoleLabel = t(roleLabelKey(active))

  const handleSwitch = async (profileId) => {
    if (profileId === active?.profileId || profileId === active?.id) {
      setOpen(false)
      return
    }

    setSwitching(true)
    try {
      await api.post('/auth/active-profile', { profileId })
      await refreshUser()
      // Every screen query is scoped by the server-side active profile.
      // Reload so no discovery/match/room data from the previous context
      // remains actionable after the switch.
      window.location.reload()
    } catch {
      // Best effort: keep the current context if the request fails.
    } finally {
      setSwitching(false)
      setOpen(false)
    }
  }

  const headerContent = (
    <>
      <span style={{
        width:30, height:30, borderRadius:'50%', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(184,167,255,0.12)', color:C.primary,
        fontSize:13, fontWeight:700,
      }}>
        {realName.charAt(0).toUpperCase()}
      </span>
      <span style={{ minWidth:0, textAlign:'left', lineHeight:1.2 }}>
        <span style={{ display:'block', color:C.text, fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {realName}
        </span>
        <span style={{ display:'block', color:C.muted, fontSize:10, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {activeTypeLabel} · {activeRoleLabel}
        </span>
      </span>
      {canSwitchProfile && (
        <span style={{ color:C.muted, fontSize:10, marginLeft:2 }}>{open ? '▲' : '▼'}</span>
      )}
    </>
  )

  return (
    <div style={{ position:'relative', minWidth:0 }}>
      {canSwitchProfile ? (
        <button
          type="button"
          aria-label={t('profileSwitcher.change')}
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          disabled={switching}
          style={{
            maxWidth:250, display:'flex', alignItems:'center', gap:8,
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
            padding:'7px 10px', cursor:switching ? 'wait' : 'pointer', minWidth:0,
          }}
        >
          {headerContent}
        </button>
      ) : (
        <div style={{
          maxWidth:250, display:'flex', alignItems:'center', gap:8,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          padding:'7px 10px', minWidth:0,
        }}>
          {headerContent}
        </div>
      )}

      {canSwitchProfile && open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', right:0, minWidth:240, zIndex:50,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden',
          boxShadow:'0 14px 36px rgba(0,0,0,0.35)',
        }}>
          <div style={{ padding:'9px 12px', color:C.muted, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:`1px solid ${C.border}` }}>
            {t('profileSwitcher.useAs')}
          </div>
          {contexts.map(ctx => {
              const isActive = ctx.profileId === active?.profileId || ctx.profileId === active?.id
              const typeLabel = t(TYPE_KEY[ctx.type] || 'common.profile')
              return (
                <button
                  type="button"
                  key={ctx.profileId}
                  onClick={() => handleSwitch(ctx.profileId)}
                  disabled={switching}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'flex-start', width:'100%',
                    background:isActive ? 'rgba(184,167,255,0.12)' : 'transparent',
                    border:'none', borderBottom:`1px solid ${C.border}`, padding:'11px 12px',
                    color:C.text, fontSize:13, cursor:switching ? 'wait' : 'pointer', textAlign:'left',
                  }}
                >
                  <span style={{ fontWeight:600 }}>{ctx.displayName || typeLabel}</span>
                  <span style={{ color:C.muted, fontSize:11, marginTop:2 }}>
                    {typeLabel} · {t(roleLabelKey(ctx))}{isActive ? ` · ${t('common.active')}` : ''}
                  </span>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
