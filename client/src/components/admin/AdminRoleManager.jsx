import { useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'
import { ADMIN_ROLES, canManageAdminRoles } from './adminRoleContracts'

export default function AdminRoleManager({ colors, userId, currentRole, viewerRole, onChanged }) {
  const C = colors
  const { t } = useI18n()
  const [selectedRole, setSelectedRole] = useState(currentRole || null)
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setSelectedRole(currentRole || null) }, [currentRole])

  const roles = useMemo(() => ADMIN_ROLES.map(value => ({
    value,
    label: t(`admin.users.roles.${value || 'USER'}.label`, value || 'USER'),
    description: t(`admin.users.roles.${value || 'USER'}.description`, ''),
  })), [t])

  if (!canManageAdminRoles(viewerRole)) return null

  const current = roles.find(role => role.value === (currentRole || null)) || roles[0]

  const save = async () => {
    const cleanReason = reason.trim()
    if (!cleanReason) {
      setError(t('admin.users.roleManager.reasonRequired'))
      return
    }

    setSaving(true)
    setMessage('')
    setError('')
    try {
      await api.put(`/admin/users/${userId}/role`, {
        adminRole: selectedRole,
        reason: cleanReason,
      })
      setMessage(t('admin.users.roleManager.updated'))
      setReason('')
      setOpen(false)
      onChanged?.()
    } catch {
      setError(t('admin.users.roleManager.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }} aria-label={t('admin.users.roleManager.title')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: open ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>
            {t('admin.users.roleManager.current')}: {current.label}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{current.description}</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', color: C.text2, fontSize: 12, cursor: 'pointer', minHeight: 34 }}
        >
          {open ? t('admin.modal.cancel') : `✏️ ${t('admin.users.roleManager.change')}`}
        </button>
      </div>

      {message && <div role="status" style={{ color: C.success, fontSize: 12, marginBottom: 8 }}>{message}</div>}
      {error && <div role="alert" style={{ color: C.danger, fontSize: 12, marginBottom: 8 }}>{error}</div>}

      {open && (
        <div>
          <div role="radiogroup" aria-label={t('admin.users.roleManager.title')} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {roles.map(role => {
              const selected = selectedRole === role.value
              return (
                <button
                  key={String(role.value)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedRole(role.value)}
                  style={{
                    textAlign: 'left', background: selected ? C.primaryDim : C.elevated,
                    border: `1.5px solid ${selected ? C.primary : C.border}`,
                    borderRadius: 10, padding: '9px 12px', cursor: 'pointer', color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: selected ? C.primary : C.text }}>{role.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{role.description}</div>
                </button>
              )
            })}
          </div>

          <input
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder={t('admin.users.roleManager.reasonPlaceholder')}
            aria-label={t('admin.users.roleManager.reasonPlaceholder')}
            style={{ width: '100%', background: C.input, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', color: C.text, fontSize: 15, marginBottom: 10, display: 'block', outline: 'none' }}
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !reason.trim()}
            style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 50, padding: 12, fontSize: 13, fontWeight: 500, color: '#0A141A', cursor: 'pointer', opacity: saving || !reason.trim() ? 0.5 : 1, minHeight: 44 }}
          >
            {saving ? '…' : t('admin.users.roleManager.save')}
          </button>
        </div>
      )}
    </section>
  )
}
