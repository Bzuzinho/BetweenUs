// Between Us — Service Worker
// Handles push notifications and offline caching

const CACHE = 'between-us-v1'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

// ─── Push notification handler ────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return

  let data = {}
  try { data = e.data.json() } catch { data = { title: 'Between Us', body: e.data.text() } }

  const title   = data.title || 'Between Us'
  const options = {
    body:    data.body || 'Nova notificação',
    icon:    '/apple-touch-icon.png',
    badge:   '/icon-144.png',
    tag:     data.tag || 'between-us',
    data:    { ...(data.data || {}), url:data.url || '/' },
    actions: data.actions || [],
    silent:  false,
    vibrate: [200, 100, 200],
  }

  e.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    data.showAppBadge !== false && self.navigator?.setAppBadge
      ? self.navigator.setAppBadge(data.notificationCount || undefined).catch(() => {})
      : Promise.resolve(),
  ]))
})

// ─── Notification click handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const data = e.notification.data || {}
  const url  = data.url || '/admin'

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      // Focus existing tab if open
      for (const client of cls) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then(navigated => navigated?.focus())
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ─── Background sync (optional future use) ────────────────────────────────────
self.addEventListener('sync', e => {
  console.log('[SW] Sync event:', e.tag)
})
