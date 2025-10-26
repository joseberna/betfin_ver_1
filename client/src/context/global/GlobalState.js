import React, { useState, useEffect } from 'react'
import GlobalContext from './globalContext'
import { useAccount } from 'wagmi'

const GlobalState = ({ children }) => {
  // --- Estados originales ---
  const [isLoading, setIsLoading] = useState(true)
  const [id, setId] = useState(null)
  const [userName, setUserName] = useState(null)
  const [email, setEmail] = useState(null)
  const [chipsAmount, setChipsAmount] = useState(null)
  const [tables, setTables] = useState(null)
  const [players, setPlayers] = useState(null)
  const [walletAddress, setWalletAddress] = useState('')

  // --- Hook de RainbowKit / Wagmi ---
  const { address, isConnected } = useAccount()

  // --- Sincronizar dirección de wallet real ---
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address)
    } else {
      setWalletAddress('')
    }
  }, [isConnected, address])

  return (
    <GlobalContext.Provider
      value={{
        isLoading,
        setIsLoading,
        userName,
        setUserName,
        email,
        setEmail,
        chipsAmount,
        setChipsAmount,
        id,
        setId,
        tables,
        setTables,
        players,
        setPlayers,
        walletAddress,
        setWalletAddress, // aún disponible si deseas asignarla manualmente
      }}
    >
      {children}
    </GlobalContext.Provider>
  )
}

export default GlobalState
