// client/src/wallet/index.js
import React from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import {
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit'
import {
  WagmiConfig,
  configureChains,
  createConfig,
} from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'
import {
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'

// ===== CHAINS (solo Sepolia) =====
export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia],
  [
    jsonRpcProvider({
      rpc: (chain) =>
        chain.id === sepolia.id
          ? { http: process.env.REACT_APP_RPC_SEPOLIA || 'https://1rpc.io/sepolia' }
          : null,
    }),
    publicProvider(),
  ],
)

// ---------- WALLETCONNECT PROJECT ID ----------
const WC_PROJECT_ID = process.env.REACT_APP_WC_PROJECT_ID

if (!WC_PROJECT_ID && process.env.NODE_ENV !== 'production') {
  console.warn('[wallet] Falta REACT_APP_WC_PROJECT_ID en tu .env')
}

// ---------- CONNECTORS ----------
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({
        chains,
        shimDisconnect: true,
        projectId: WC_PROJECT_ID,
      }),
      walletConnectWallet({
        chains,
        projectId: WC_PROJECT_ID,
      }),
    ],
  },
])

// ---------- CONFIG ----------
const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
  webSocketPublicClient,
})

// ---------- PROVIDER ----------
export function WalletProvider({ children }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        theme={darkTheme()}
        modalSize="compact"
        initialChain={sepolia}
        appInfo={{ appName: 'Bet Poker' }}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  )
}

// También lo exportamos por defecto (para compatibilidad)
export default WalletProvider
