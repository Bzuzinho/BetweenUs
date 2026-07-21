import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../lib/design'
import { getUserDisplayName } from '../../lib/userDisplay'
import { useI18n } from '../../i18n/I18nContext'
import AdminNotificationBell from './AdminNotificationBell'

export default function AdminHeader({ user, onLogout, colors }) {
  const C = colors
  const { t } = useI18n()
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    const closeOutside = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [])

  const displayName = getUserDisplayName(user) || t('admin.account.fallbackName')
  const initials = (displayName || '?')[0].toUpperCase()

  const menuItems = [
    {
      key: 'account',
      label: t('admin.account.adminAccount'),
      action: () => { navigate('/admin/me'); setShowMenu(false) },
    },
    {
      key: 'password',
      label: t('admin.account.changePassword'),
      action: () => { navigate('/forgot-password'); setShowMenu(false) },
    },
    {
      key: 'logout',
      label: t('admin.account.logout'),
      action: onLogout,
      danger: true,
    },
  ]

  return (
    <header style={{
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      paddingTop: 'calc(10px + env(safe-area-inset-top))',
      paddingBottom: 10,
      paddingLeft: 16,
      paddingRight: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      minHeight: 'calc(56px + env(safe-area-inset-top))',
    }}>
      <div style={{ flexShrink: 0 }}><Logo size={34} /></div>
      <span style={{ fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: '-0.01em', flexShrink: 0 }}>
        Between Us
      </span>
      <div style={{ flex: 1 }} />

      <AdminNotificationBell colors={C} />

      <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => setShowMenu(value => !value)}
          aria-expanded={showMenu}
          aria-haspopup="menu"
          style={{ cursor: 'pointer', textAlign: 'right', background: 'none', border: 'none', padding: 0 }}
          className="admin-name-block"
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, color: C.primary, lineHeight: 1.2 }}>{user?.adminRole}</div>
        </button>

        <button
          type="button"
          aria-label={displayName}
          aria-expanded={showMenu}
          aria-haspopup="menu"
          onClick={() => setShowMenu(value => !value)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.primaryDim,
            border: `1.5px solid ${C.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: C.primary,
            cursor: 'pointer',
            flexShrink: 0,
            overflow: 'hidden',
            padding: 0,
          }}
        >
          {user?.avatarPath
            ? <img src={user.avatarPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : initials}
        </button>

        {showMenu && (
          <div role="menu" style={{
            position: 'absolute',
            top: 42,
            right: 0,
            width: 200,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 200,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: C.primary, marginBottom: 2 }}>{user?.adminRole}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{user?.email}</div>
            </div>

            {menuItems.map(item => (
              <button
                type="button"
                role="menuitem"
                key={item.key}
                onClick={item.action}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  borderBottom: `1px solid ${C.border}`,
                  color: item.danger ? C.danger : C.text,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
