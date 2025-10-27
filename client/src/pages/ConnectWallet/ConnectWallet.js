
import React, { useContext, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import globalContext from '../../context/global/globalContext'
import socketContext from '../../context/websocket/socketContext'
import { CS_FETCH_LOBBY_INFO } from '../../pokergame/actions'

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:7777').replace(/\/$/, '')

export default function ConnectWallet() {
  const { isConnected, address } = useAccount()
  const { setWalletAddress } = useContext(globalContext)
  const { socket } = useContext(socketContext)

  const navigate = useNavigate()
  const location = useLocation()
  const didGoLobby = useRef(false)

  // Si se conecta la wallet → ir al lobby (y SOLO al lobby)
  useEffect(() => {
    if (isConnected && !didGoLobby.current) {
      didGoLobby.current = true
      navigate('/lobby', { replace: true })
    }
  }, [isConnected, navigate])

  const params = useMemo(() => {
    const q = new URLSearchParams(location.search)
    return {
      gameId: q.get('gameId') || '1',
      username: q.get('username') || (address ? `guest_${address.slice(2, 6)}` : 'guest'),
    }
  }, [location.search, address])

  async function ensureToken(addr) {
    let token = localStorage.getItem('token')
    if (!token) {
      const res = await fetch(`${API_URL}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      if (!res.ok) throw new Error('No pude obtener token')
      const data = await res.json()
      token = data.token
      localStorage.setItem('token', token)
    }
    if (socket && !socket.connected) {
      socket.auth = { token }
      socket.connect()
    }
  }

  // Cargar info de lobby (NO navegamos a /play aquí)
  useEffect(() => {
    if (!isConnected || !address || !socket) return
    ;(async () => {
      try { await ensureToken(address) } catch {}
      setWalletAddress(address)
      const emit = () =>
        socket.emit(CS_FETCH_LOBBY_INFO, {
          walletAddress: address,
          socketId: socket.id,
          gameId: params.gameId,
          username: params.username,
        })
      if (socket.connected) emit()
      else socket.once('connect', emit)
      return () => socket.off?.('connect', emit)
    })()
  }, [isConnected, address, socket, params.gameId, params.username, setWalletAddress])

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <ConnectButton showBalance={false} />
    </div>
  )
}
