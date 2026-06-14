import { useState, useEffect, useCallback } from 'react'
import { pushApi } from '@/api/push'
import { useAuthStore } from '@/store/auth'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function doSubscribe() {
  const publicKey = await pushApi.getVapidKey()
  if (!publicKey) return

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }
  const json = sub.toJSON()
  await pushApi.subscribe({
    endpoint: json.endpoint!,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
  })
}

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export function usePush() {
  const { user } = useAuthStore()
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

  const [permission, setPermission] = useState<PushPermission>(
    supported ? (Notification.permission as PushPermission) : 'unsupported'
  )

  // If already granted on mount — subscribe silently (re-register endpoint)
  useEffect(() => {
    if (!user || !supported) return
    if (Notification.permission === 'granted') {
      doSubscribe().catch(() => {})
      setPermission('granted')
    }
  }, [user, supported])

  const requestPermission = useCallback(async () => {
    if (!supported) return
    const perm = await Notification.requestPermission()
    setPermission(perm as PushPermission)
    if (perm === 'granted') {
      await doSubscribe().catch(() => {})
    }
  }, [supported])

  return { permission, requestPermission, supported }
}
