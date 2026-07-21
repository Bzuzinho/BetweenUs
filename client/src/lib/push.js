// Between Us — Push notification registration
//
// Security follow-up — this used to hardcode the VAPID public key
// directly (a copy of the same value the server also hardcoded, which
// was the actual problem — see webpush.ts). The public half being in
// client code was never itself a security issue (that's how VAPID is
// designed to work), but hardcoding it here meant a future key rotation
// would require a client redeploy to stay in sync with the server's
// private key, silently breaking push subscriptions if the two drifted.
// Fetching it from the server (already-existing GET /push/vapid-key
// route, previously unused by this file) means rotation only touches
// server env vars.
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export const registerPush = async (api, { requestPermission = false } = {}) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[PUSH] Not supported')
    return false
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      const subJson = existing.toJSON()
      await api.post('/push/subscribe', { endpoint: subJson.endpoint, keys: subJson.keys }).catch(() => {})
      return true
    }

    const { data } = await api.get('/push/vapid-key').catch(() => ({ data: {} }))
    if (!data?.publicKey) { console.log('[PUSH] No VAPID public key configured server-side — skipping.'); return false }

    if (Notification.permission === 'default' && !requestPermission) return false
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    if (permission !== 'granted') { console.log('[PUSH] Denied'); return false }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    })
    const subJson = sub.toJSON()
    await api.post('/push/subscribe', { endpoint: subJson.endpoint, keys: subJson.keys })
    console.log('[PUSH] ✅ Subscribed')
    return true
  } catch (err) {
    console.error('[PUSH] Failed:', err.message)
    return false
  }
}

export const unregisterPush = async api => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return true
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return true
    const endpoint = subscription.endpoint
    await api.delete('/push/unsubscribe', { data:{ endpoint } }).catch(() => {})
    await subscription.unsubscribe()
    return true
  } catch (err) {
    console.error('[PUSH] Unsubscribe failed:', err.message)
    return false
  }
}

export const setAppBadge = async count => {
  try {
    if (count > 0 && 'setAppBadge' in navigator) await navigator.setAppBadge(count)
    else if ('clearAppBadge' in navigator) await navigator.clearAppBadge()
  } catch {
    // Badging is progressive enhancement and is not available in every browser.
  }
}
