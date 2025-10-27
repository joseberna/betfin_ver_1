import React, { useContext } from 'react'
import { useDisconnect } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import socketContext from '../../context/websocket/socketContext'
import globalContext from '../../context/global/globalContext'
import gameContext from '../../context/game/gameContext'

export default function DisconnectButton() {
  const navigate = useNavigate()
  const { disconnectAsync } = useDisconnect()
  const { socket } = useContext(socketContext)
  const { setSelectedTableId, setTables, setPlayers } = useContext(globalContext)
  const { resetGameState } = useContext(gameContext)

  const onDisconnect = async () => {
    try {
      // 1️⃣ Emit and close socket
      if (socket?.connected) {
        socket.emit('CS_DISCONNECT')
        socket.disconnect()
      }

      // 2️⃣ Clear all contexts
      setSelectedTableId(null)
      setTables([])
      setPlayers([])
      resetGameState?.()

      // 3️⃣ Disconnect wallet cleanly
      await disconnectAsync()

      // 4️⃣ Hard navigation to ensure full remount
      window.location.href = '/'
    } catch (e) {
      console.error('disconnect error', e)
      window.location.reload()
    }
  }

  return (
    <button
      onClick={onDisconnect}
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'transparent',
        color: '#e9fef9',
        cursor: 'pointer',
      }}
      title="Disconnect wallet"
    >
      Disconnect
    </button>
  )
}
