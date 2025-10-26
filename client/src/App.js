// client/src/App.js
import React from 'react'
import AppRoutes from './components/routing/Routes'
import { WalletProvider } from './wallet'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.scss'

const App = () => {
  return (
    <WalletProvider>
      <AppRoutes />
    </WalletProvider>
  )
}

export default App
