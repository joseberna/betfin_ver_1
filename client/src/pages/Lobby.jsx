import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import gameContext from '../context/game/gameContext'
import { CS_FETCH_LOBBY_INFO } from '../pokergame/actions'
import DisconnectButton from '../components/buttons/DisconnectButton'


function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <div style={{ opacity: 0.65, fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function TableCard({ table, onJoin }) {
  const sb = table.smallBlind ?? table.limit / 40
  const bb = table.bigBlind ?? (table.limit / 40) * 2
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 16,
        padding: 16,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        background: 'rgba(255,255,255,.03)',
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{table.name}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <Stat label="Players" value={`${table.currentNumberPlayers}/${table.maxPlayers}`} />
          <Stat label="Blinds" value={`${sb} / ${bb}`} />
          <Stat label="Buy-in" value={table.limit} />
        </div>
      </div>
      <div style={{ alignSelf: 'center' }}>
        <button
          onClick={() => onJoin(table.id)}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: 'none',
            background: '#20c997',
            color: '#051b17',
            fontWeight: 700,
            cursor: 'pointer',
            transition: '0.2s all ease-in-out',
          }}
          onMouseOver={(e) => (e.target.style.background = '#1fb387')}
          onMouseOut={(e) => (e.target.style.background = '#20c997')}
        >
          Join
        </button>
      </div>
    </div>
  )
}

export default function Lobby() {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()
  const { socket } = useContext(socketContext)
  const { tables, players, setSelectedTableId, setTables, setPlayers } = useContext(globalContext)
  const { joinTable } = useContext(gameContext)
  const [loading, setLoading] = useState(true)

  // Pedir info de lobby al montar
  useEffect(() => {
    if (!socket) return
    setLoading(true)
    socket.emit(CS_FETCH_LOBBY_INFO, {
      walletAddress: address,
      username: address ? `player_${address.slice(2, 6)}` : undefined,
    })
  }, [socket, address])

  useEffect(() => {
    if (Array.isArray(tables)) setLoading(false)
  }, [tables])

  const handleJoin = (tableId) => {
    console.log('[lobby] joining table', tableId)
    setSelectedTableId(tableId)
    navigate('/play', { replace: true })
  }

  const handleDisconnect = async () => {
    try {
      disconnect()
      setSelectedTableId(null)
      setTables([])
      setPlayers([])
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Error disconnecting wallet:', err)
    }
  }

  const sortedTables = useMemo(() => {
    if (!Array.isArray(tables)) return []
    return [...tables].sort((a, b) => a.id - b.id)
  }, [tables])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(60% 60% at 50% 0%, #0a312c 0%, #071716 45%, #050b0a 100%)',
        color: '#e9fef9',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Bet Poker</div>
          <div style={{ opacity: 0.6, fontSize: 12 }}>
            {isConnected ? `Wallet: ${address?.slice(0, 6)}…${address?.slice(-4)}` : 'Not connected'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Stat label="Players online" value={Array.isArray(players) ? players.length : 0} />
          {isConnected && <DisconnectButton />}
        </div>
      </header>

      {/* Contenido principal */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
        <h2 style={{ margin: '8px 0 16px 0' }}>Available tables</h2>

        {loading && <div style={{ opacity: 0.7, fontSize: 14 }}>Loading lobby…</div>}

        {!loading && sortedTables.length === 0 && (
          <div style={{ opacity: 0.7, fontSize: 14 }}>No tables available.</div>
        )}

        <div style={{ display: 'grid', gap: 14 }}>
          {sortedTables.map((t) => (
            <TableCard key={t.id} table={t} onJoin={handleJoin} />
          ))}
        </div>
      </main>
    </div>
  )
}
