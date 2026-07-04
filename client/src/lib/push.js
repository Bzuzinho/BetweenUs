// Between Us — Push notification registration
const VAPID_PUBLIC_KEY = 'BLSayTEUWhVEb-QdJSClF_6SIZQX8sfxvwEGPnfF-cxDtVepyPjuPXzIb2BkhsfogR-JbJFBa7aHUvwSyXxGg9Y'

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export const registerPush = async (api) => {
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

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { console.log('[PUSH] Denied'); return false }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
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
