import { useI18n } from '../../i18n/I18nContext'
import { ADMIN_ROLE_REFERENCE } from './adminSettingsContracts'

export default function AdminRoleReference({ colors }) {
  const C = colors
  const { t } = useI18n()
  return <section aria-label={t('admin.settings.roles.title')}>
    <div style={{ background:C.primaryDim, border:`1px solid ${C.primary}`, borderRadius:12, padding:'12px 16px', marginBottom:16, color:C.primary, fontSize:13 }}>{t('admin.settings.roles.description')}</div>
    {ADMIN_ROLE_REFERENCE.map(role => <div key={role.value} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:10 }}><div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:10 }}><div><div style={{ fontSize:16, fontWeight:600, color:C.text }}>{t(`admin.users.roles.${role.value}.label`, role.value)}</div><div style={{ fontSize:13, color:C.muted }}>{t(`admin.users.roles.${role.value}.description`, '')}</div></div><code style={{ color:C.text2, fontSize:11 }}>{role.value}</code></div><div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', marginBottom:6 }}>{t('admin.settings.roles.permissions')}</div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{role.permissions.map(permission => <span key={permission} style={{ background:permission === '*' ? C.successDim : C.elevated, border:`1px solid ${permission === '*' ? C.success : C.border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:permission === '*' ? C.success : C.text2 }}>{permission === '*' ? t('admin.settings.roles.fullAccess') : permission}</span>)}</div></div>)}
  </section>
}
