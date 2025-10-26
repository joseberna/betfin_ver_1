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
  const didNavigate = useRef(false)

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
      // adapta a tu endpoint real
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
    // si ya hay socket creado, actualiza el auth y reconecta
    if (socket && !socket.connected) {
      socket.auth = { token }
      socket.connect()
    }
  }

  useEffect(() => {
    if (!isConnected || !address || !socket) return;
    ensureToken(address).catch(console.error)
    const go = () => {
      setWalletAddress(address);

      socket.emit(CS_FETCH_LOBBY_INFO, {
        walletAddress: address,
        socketId: socket.id,
        gameId: params.gameId,
        username: params.username,
      });

      if (!didNavigate.current) {
        didNavigate.current = true;
        navigate('/play', { replace: true });
      }
    };

    // si ya está conectado, navega; si no, espera al evento
    if (socket.connected) {
      go();
    } else {
      socket.once('connect', go);
    }

    // por si hay error de conexión, mira qué pasa
    const onErr = (err) => console.log('socket connect_error:', err?.message || err);
    socket.on('connect_error', onErr);

    return () => {
      socket.off('connect', go);
      socket.off('connect_error', onErr);
    };
  }, [isConnected, address, socket, params.gameId, params.username, navigate, setWalletAddress]);

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <ConnectButton showBalance={false} />
      {isConnected && !didNavigate.current && (
        <button style={{ marginTop: 16 }} onClick={() => {
          didNavigate.current = true
          navigate('/play', { replace: true })
        }}>
          Continuar
        </button>
      )}
    </div>
  )
}
