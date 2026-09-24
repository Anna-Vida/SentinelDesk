import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../api/client'
import type { ConnectionState, RealtimeEvents } from '../types'

export type RealtimeEvent = {
  [K in keyof RealtimeEvents]: { name: K; payload: RealtimeEvents[K] }
}[keyof RealtimeEvents]

const eventNames = [
  'IncidentCreated', 'IncidentUpdated', 'IncidentStatusChanged',
  'IncidentArchived', 'SecurityEventCreated', 'SecurityEventLinked',
] as const

export function useSecurityHub(onEvent: (event: RealtimeEvent) => void) {
  const [state, setState] = useState<ConnectionState>('Disconnected')
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/security`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    eventNames.forEach((name) => connection.on(name, (payload) => handlerRef.current({ name, payload } as RealtimeEvent)))
    connection.onreconnecting(() => setState('Reconnecting'))
    connection.onreconnected(() => setState('Connected'))
    connection.onclose(() => setState('Disconnected'))

    let active = true
    connection.start()
      .then(() => active && setState('Connected'))
      .catch(() => active && setState('Disconnected'))

    return () => {
      active = false
      eventNames.forEach((name) => connection.off(name))
      if (connection.state !== HubConnectionState.Disconnected) void connection.stop()
    }
  }, [])

  return state
}
