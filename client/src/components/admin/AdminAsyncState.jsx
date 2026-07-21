import { useI18n } from '../../i18n/I18nContext'

export default function AdminAsyncState({
  colors,
  state = 'loading',
  message,
  onRetry,
  compact = false,
}) {
  const C = colors
  const { t } = useI18n()

  const content = {
    loading: {
      icon: '…',
      text: message || t('admin.common.loading'),
      role: 'status',
    },
    error: {
      icon: '!',
      text: message || t('admin.common.error'),
      role: 'alert',
    },
    unavailable: {
      icon: '—',
      text: message || t('admin.common.unavailable'),
      role: 'status',
    },
  }[state] || {
    icon: '—',
    text: message || t('admin.common.unavailable'),
    role: 'status',
  }

  return (
    <div
      role={content.role}
      aria-live={state === 'error' ? 'assertive' : 'polite'}
      style={{
        minHeight: compact ? 72 : 140,
        padding: compact ? '16px 18px' : '28px 24px',
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        background: C.surface,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: state === 'error' ? C.dangerDim : C.primaryDim,
        color: state === 'error' ? C.danger : C.primary,
        fontSize: 16,
        fontWeight: 700,
      }}>
        {content.icon}
      </div>

      <div style={{ color: C.text2, fontSize: 13, lineHeight: 1.5 }}>
        {content.text}
      </div>

      {state === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 2,
            border: `1px solid ${C.primary}`,
            borderRadius: 9,
            padding: '8px 14px',
            background: C.primaryDim,
            color: C.primary,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {t('admin.common.retry')}
        </button>
      )}
    </div>
  )
}
