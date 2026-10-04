import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../api/client'
import type { ConnectionState, RealtimeEvents } from '../types'
export type RealtimeEvent = { [K in keyof RealtimeEvents]: { name: K; payload: RealtimeEvents[K] } }[keyof RealtimeEvents]
const names = ['IncidentCreated', 'IncidentUpdated', 'IncidentStatusChanged', 'IncidentArchived', 'SecurityEventCreated', 'SecurityEventLinked'] as const
export function useSecurityHub(onEvent: (event: RealtimeEvent) => void, onConnected: () => void) {
  const [state, setState] = useState<ConnectionState>('Disconnected')
  const handler = useRef(onEvent)
  const connected = useRef(onConnected)
  useEffect(() => { handler.current = onEvent; connected.current = onConnected }, [onEvent, onConnected])
  useEffect(() => {
    let active = true
    let retry: ReturnType<typeof setTimeout> | undefined
    const connection = new HubConnectionBuilder().withUrl(`${API_BASE_URL}/hubs/security`)
      .withAutomaticReconnect().configureLogging(LogLevel.Warning).build()
    const ready = () => { if (active) { setState('Connected'); connected.current() } }
    const start = async () => {
      try { await connection.start(); if (!active) { await connection.stop(); return }; ready() }
      catch { if (active) { setState('Disconnected'); retry = setTimeout(() => { void start() }, 5000) } }
    }
    names.forEach(name => connection.on(name, payload => { if (active) handler.current({ name, payload } as RealtimeEvent) }))
    connection.onreconnecting(() => { if (active) setState('Reconnecting') })
    connection.onreconnected(ready)
    connection.onclose(() => { if (active) { setState('Disconnected'); retry = setTimeout(() => { void start() }, 5000) } })
    void start()
    return () => { active = false; clearTimeout(retry); void connection.stop() }
  }, [])
  return state
}
