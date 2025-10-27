import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Play from '../../pages/Play'
import Lobby from '../../pages/Lobby'
import NotFoundPage from '../../pages/NotFoundPage'
import ConnectWallet from '../../pages/ConnectWallet'
import { useAccount } from 'wagmi'

const Protected = ({ children }) => {
  const { isConnected } = useAccount()
  return isConnected ? children : <Navigate to="/" replace />
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<ConnectWallet />} />
    <Route
      path="/lobby"
      element={
        <Protected>
          <Lobby />
        </Protected>
      }
    />
    <Route
      path="/play"
      element={
        <Protected>
          <Play />
        </Protected>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
)

export default AppRoutes
