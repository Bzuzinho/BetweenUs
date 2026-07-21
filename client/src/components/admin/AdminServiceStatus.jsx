import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'

export default function AdminServiceStatus({ role, colors }) {
  const C = colors
  const { t } = useI18n()
  const [active, setActive] = useState(false)
  const [session, setSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    api.get('/admin/service/status').then(response => {
      setActive(response.data.active)
      setSession(response.data.session)
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!active || !session) return undefined
    const updateElapsed = () => {
      setElapsed(Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))
    }
    updateElapsed()
    const timer = setInterval(updateElapsed, 30000)
    return () => clearInterval(timer)
  }, [active, session])

  const toggle = async () => {
    setLoading(true)
    try {
      if (active) {
        await api.post('/admin/service/end')
        setActive(false)
        setSession(null)
        setElapsed(0)
      } else {
        await api.post('/admin/service/start')
        setActive(true)
        load()
      }
    } catch {}
    setLoading(false)
  }

  if (!['MODERATOR', 'SUPPORT'].includes(role)) return null

  const startDescription = role === 'MODERATOR'
    ? t('admin.service.startModerator')
    : t('admin.service.startSupport')

  return (
    <div style={{
      margin: '0 12px 10px',
      background: active ? 'rgba(74,222,128,0.08)' : C.elevated,
      border: `1px solid ${active ? 'rgba(74,222,128,0.3)' : C.border}`,
      borderRadius: 12, padding: '10px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: active ? C.success : C.muted }}>
          {active ? `● ${t('admin.service.active')} · ${elapsed}m` : `○ ${t('admin.service.inactive')}`}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {active ? t('admin.service.activeDescription') : startDescription}
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-busy={loading}
        style={{
          background: active ? C.dangerDim : C.successDim,
          border: `1px solid ${active ? C.danger : C.success}`,
          borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500,
          color: active ? C.danger : C.success, cursor: loading ? 'wait' : 'pointer', flexShrink: 0,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '…' : active ? t('admin.service.stop') : t('admin.service.start')}
      </button>
    </div>
  )
}
