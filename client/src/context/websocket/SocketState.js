// client/src/context/websocket/SocketState.js (o equivalente)
import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import GlobalContext from '../global/globalContext'

const SocketState = ({ children }) => {
  const { walletAddress } = React.useContext(GlobalContext)
  const [socket, setSocket] = useState(null)
  const sockRef = useRef(null)

  useEffect(() => {
    // si no hay address, asegúrate de cerrar
    if (!walletAddress) {
      if (sockRef.current) {
        sockRef.current.disconnect()
        sockRef.current = null
        setSocket(null)
      }
      return
    }

    // conecta con la address
    const s = io(process.env.REACT_APP_WS_URL || 'http://localhost:7777', {
      query: { address: walletAddress },
      transports: ['websocket'],
    })
    sockRef.current = s
    setSocket(s)

    return () => {
      if (sockRef.current) {
        sockRef.current.disconnect()
        sockRef.current = null
        setSocket(null)
      }
    }
  }, [walletAddress])

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}

export default SocketState
