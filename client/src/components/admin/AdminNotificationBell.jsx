import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useI18n } from '../../i18n/I18nContext'

const QUEUE_TAB = {
  verificationsPending: 'verifications',
  profilesPendingReview: 'profiles',
  reportsPending: 'reports',
  reportsCritical: 'reports',
  photosPending: 'photos',
}

export default function AdminNotificationBell({ colors }) {
  const C = colors
  const { t, formatDate } = useI18n()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [workQueue, setWorkQueue] = useState({})
  const ref = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.get('/admin/notifications').then(response => setNotifications(response.data.notifications || [])).catch(() => {})
    api.get('/admin/notifications/summary').then(response => setWorkQueue(response.data.workQueue || {})).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    const closeOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [])

  const unread = notifications.filter(notification => !notification.readAt).length
  const queueTotal = (workQueue.verificationsPending || 0)
    + (workQueue.profilesPendingReview || 0)
    + (workQueue.reportsPending || 0)
    + (workQueue.photosPending || 0)
  const totalAttention = unread + queueTotal

  const markRead = async id => {
    await api.put(`/admin/notifications/${id}/read`).catch(() => {})
    setNotifications(previous => previous.map(notification => (
      notification.id === id ? { ...notification, readAt: new Date() } : notification
    )))
  }

  const remove = async id => {
    await api.delete(`/admin/notifications/${id}`).catch(() => {})
    setNotifications(previous => previous.filter(notification => notification.id !== id))
  }

  const removeAll = async () => {
    await api.delete('/admin/notifications').catch(() => {})
    setNotifications([])
    setOpen(false)
  }

  const queueLabel = key => t(`admin.notifications.queue.${key}`, key)
  const criticalSuffix = count => t('admin.notifications.criticalCount', '{count} critical').replace('{count}', count)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={t('admin.notifications.title')}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        style={{
          position: 'relative', background: 'none',
          border: `1px solid ${totalAttention > 0 ? 'rgba(184,167,255,0.4)' : C.border}`,
          borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          color: totalAttention > 0 ? C.primary : C.text2, transition: 'all 0.2s',
        }}
      >
        🔔
        {totalAttention > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, background: C.danger, color: '#fff',
            fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px',
            minWidth: 16, textAlign: 'center', animation: 'pulse 1.5s infinite',
          }}>
            {totalAttention > 9 ? '9+' : totalAttention}
          </span>
        )}
      </button>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.15)} }`}</style>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, width: 300, maxHeight: 400,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{t('admin.notifications.title')}</span>
            {notifications.length > 0 && (
              <button type="button" onClick={removeAll} style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                {t('admin.notifications.clearAll')}
              </button>
            )}
          </div>

          {queueTotal > 0 && (
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              {Object.entries(workQueue)
                .filter(([key, value]) => key !== 'reportsCritical' && value > 0)
                .map(([key, value]) => (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setOpen(false); navigate(`/admin/${QUEUE_TAB[key]}`) }}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setOpen(false)
                        navigate(`/admin/${QUEUE_TAB[key]}`)
                      }
                    }}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: C.text }}
                  >
                    <span>
                      {queueLabel(key)}
                      {key === 'reportsPending' && workQueue.reportsCritical > 0
                        ? ` (${criticalSuffix(workQueue.reportsCritical)})`
                        : ''}
                    </span>
                    <span style={{ background: C.primaryDim, color: C.primary, borderRadius: 8, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
            </div>
          )}

          <div style={{ overflowY: 'auto', maxHeight: 320 }}>
            {notifications.length === 0 && queueTotal === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>{t('admin.notifications.empty')}</div>
            )}
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => {
                  markRead(notification.id)
                  try {
                    const data = notification.data ? JSON.parse(notification.data) : {}
                    if (data.tab) { setOpen(false); navigate(`/admin/${data.tab}`) }
                  } catch {}
                }}
                style={{
                  padding: '12px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
                  background: notification.readAt ? 'none' : C.elevated, display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: notification.readAt ? 400 : 500, color: C.text }}>{notification.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{notification.body}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{formatDate(notification.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
                <button
                  type="button"
                  aria-label={t('admin.notifications.delete')}
                  onClick={event => { event.stopPropagation(); remove(notification.id) }}
                  style={{ color: C.muted, fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
