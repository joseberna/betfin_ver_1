import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import SocketContext from './socketContext'
import {
  CS_DISCONNECT,
  SC_PLAYERS_UPDATED,
  SC_RECEIVE_LOBBY_INFO,
  SC_TABLES_UPDATED,
} from '../../pokergame/actions'
import globalContext from '../global/globalContext'

const SOCKET_URL = (process.env.REACT_APP_SOCKET_URL || 'http://localhost:7777').replace(/\/$/, '')

export default function WebsocketProvider({ children }) {
  const { setTables, setPlayers, setChipsAmount } = React.useContext(globalContext)
  const [socketId, setSocketId] = useState(null)

  const socket = useMemo(() => {
    const isProd = process.env.NODE_ENV === 'production'
    const token = (isProd && localStorage.getItem('token')) || undefined

    return io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      upgrade: false,
      withCredentials: true,
      ...(token ? { auth: { token } } : {}),  // en dev no manda token
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    })
  }, [])

  useEffect(() => {
    console.log('[socket] conectando a', SOCKET_URL)

    const onConnect = () => {
      console.log('[socket] ✅ conectado', socket.id)
      setSocketId(socket.id)
    }
    const onConnectError = (err) => {
      console.error('[socket] ❌ connect_error:', err?.message || err)
    }
    const onDisconnect = (reason) => {
      console.warn('[socket] ⚠️ desconectado:', reason)
    }

    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)
    socket.on('disconnect', onDisconnect)

    socket.on(SC_RECEIVE_LOBBY_INFO, ({ tables, players, socketId, amount }) => {
      setSocketId(socketId)
      setChipsAmount(amount)
      setTables(tables)
      setPlayers(players)
    })

    socket.on(SC_PLAYERS_UPDATED, setPlayers)
    socket.on(SC_TABLES_UPDATED, setTables)

    const handleBeforeUnload = () => {
      try { socket.emit(CS_DISCONNECT) } catch {}
      try { socket.close() } catch {}
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      try { socket.emit(CS_DISCONNECT) } catch {}
      try { socket.close() } catch {}
      socket.off('connect', onConnect)
      socket.off('connect_error', onConnectError)
      socket.off('disconnect', onDisconnect)
      socket.off(SC_RECEIVE_LOBBY_INFO)
      socket.off(SC_PLAYERS_UPDATED)
      socket.off(SC_TABLES_UPDATED)
    }
  }, [socket, setChipsAmount, setPlayers, setTables])

  const cleanUp = React.useCallback(() => {
    try { socket.emit(CS_DISCONNECT) } catch {}
    try { socket.close() } catch {}
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, socketId, cleanUp }}>
      {children}
    </SocketContext.Provider>
  )
}
