import { useI18n } from '../../i18n/I18nContext'
import { ADMIN_PRIVACY_FIELDS } from './adminUserSensitiveContracts'

export default function AdminUserPrivacyPanel({ colors, privacySettings }) {
  const C = colors
  const { t } = useI18n()

  if (!privacySettings) {
    return <div style={{ color:C.muted, padding:20, textAlign:'center' }}>{t('admin.userPrivacy.empty')}</div>
  }

  const valueFor = field => {
    const value = privacySettings[field]
    if (typeof value === 'boolean') return value ? t('admin.userPrivacy.yes') : t('admin.userPrivacy.no')
    if (field === 'minDistanceKm' && value != null) return `${value} km`
    return value ?? '—'
  }

  return (
    <section aria-label={t('admin.userPrivacy.title')} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, fontSize:13, color:C.text2 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8 }}>
        {ADMIN_PRIVACY_FIELDS.map(field => (
          <div key={field} style={{ background:C.elevated, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', marginBottom:3 }}>{t(`admin.userPrivacy.fields.${field}`)}</div>
            <div style={{ color:C.text, fontSize:13 }}>{valueFor(field)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:C.muted, marginTop:12 }}>{t('admin.userPrivacy.readOnly')}</div>
    </section>
  )
}
