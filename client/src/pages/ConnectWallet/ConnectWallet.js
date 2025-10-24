// client/src/pages/ConnectWallet/index.js (o ConnectWallet.js)
import React, { useContext, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import globalContext from '../../context/global/globalContext'
import socketContext from '../../context/websocket/socketContext'
import { CS_FETCH_LOBBY_INFO } from '../../pokergame/actions'
import LoadingScreen from '../../components/loading/LoadingScreen'

const ConnectWallet = () => {
  const { setWalletAddress, setChipsAmount } = useContext(globalContext)
  const { socket } = useContext(socketContext)
  const navigate = useNavigate()
  const query = new URLSearchParams(useLocation().search)

  useEffect(() => {
    if (!socket || !socket.connected) return

    // 1) leer query
    let walletAddress = query.get('walletAddress')
    let gameId = query.get('gameId')
    let username = query.get('username')

    // 2) fallbacks de desarrollo
    if (!walletAddress) walletAddress = '0x' + Math.random().toString(16).slice(2, 8).padEnd(40, '0')
    if (!gameId) gameId = 1
    if (!username) username = 'guest_' + Math.floor(Math.random() * 1000)

    setWalletAddress(walletAddress)

    // 3) emitir lobby
    socket.emit(CS_FETCH_LOBBY_INFO, {
      walletAddress,
      socketId: socket.id,
      gameId,
      username,
    })
    console.log('ConnectWallet.usseEffect emit:', CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })

    // 4) navegar a la mesa
    navigate('/play')
  }, [socket?.connected]) // importante: dispara cuando realmente conecta

  return <LoadingScreen />
}

export default ConnectWallet
