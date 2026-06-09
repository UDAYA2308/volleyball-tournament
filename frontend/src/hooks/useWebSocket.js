import { useEffect, useRef, useState, useCallback } from 'react'

export function useWebSocket(url) {
  const [data, setData]           = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef                     = useRef(null)
  const reconnectRef              = useRef(null)

  const connect = useCallback(() => {
    if (!url) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      console.log(`[WS] Connected: ${url}`)
    }

    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data)
        setData(parsed)
      } catch {
        console.error('[WS] Parse error', e.data)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      console.log(`[WS] Disconnected. Reconnecting in 3s...`)
      // Auto reconnect
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = (e) => {
      console.error('[WS] Error', e)
      ws.close()
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  return { data, connected }
}