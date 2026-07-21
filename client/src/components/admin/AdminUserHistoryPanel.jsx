import { useI18n } from '../../i18n/I18nContext'

export default function AdminUserHistoryPanel({ colors, history = [] }) {
  const C = colors
  const { t, formatDate } = useI18n()

  return (
    <section aria-label={t('admin.userHistory.title')}>
      <div style={{ background:C.primaryDim, border:`1px solid rgba(184,167,255,0.2)`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:C.primary }}>
        {t('admin.userHistory.restricted')}
      </div>
      {history.length === 0 && <div style={{ color:C.muted }}>{t('admin.userHistory.empty')}</div>}
      {history.map(item => (
        <article key={item.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4 }}>
            <span style={{ color:C.primary, fontWeight:500, fontSize:12 }}>{item.action}</span>
            <span style={{ color:C.muted, fontSize:10 }}>{formatDate(item.createdAt, { dateStyle:'short', timeStyle:'short' })}</span>
          </div>
          <div style={{ fontSize:11, color:C.text2 }}>{t('admin.userHistory.by')}: {item.admin?.email || '—'}</div>
          {item.reason && <div style={{ fontSize:11, color:C.text, marginTop:3 }}>{t('admin.userHistory.reason')}: {item.reason}</div>}
          {item.previousData && (
            <details style={{ marginTop:6 }}>
              <summary style={{ color:C.muted, fontSize:10, cursor:'pointer' }}>{t('admin.userHistory.changes')}</summary>
              <div style={{ marginTop:4, fontSize:10, wordBreak:'break-word' }}>
                <div style={{ color:C.muted }}>{t('admin.userHistory.before')}: <code style={{ color:C.text2 }}>{JSON.stringify(item.previousData)}</code></div>
                {item.newData && <div style={{ color:C.muted, marginTop:2 }}>{t('admin.userHistory.after')}: <code style={{ color:C.success }}>{JSON.stringify(item.newData)}</code></div>}
              </div>
            </details>
          )}
        </article>
      ))}
    </section>
  )
}
