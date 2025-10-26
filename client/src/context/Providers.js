import React from 'react'
import GlobalState from './global/GlobalState'
import { ThemeProvider } from 'styled-components'
import ModalProvider from './modal/ModalProvider'
import theme from '../styles/theme'
import Normalize from '../styles/Normalize'
import GlobalStyles from '../styles/Global'
import { BrowserRouter } from 'react-router-dom'
import WebSocketProvider from './websocket/WebsocketProvider'
import GameState from './game/GameState'
import WalletProvider from '../wallet';

const Providers = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <WalletProvider>
        <GlobalState>
          <WebSocketProvider>
            <ModalProvider>
              <GameState>
                <Normalize />
                <GlobalStyles />
                {children}
              </GameState>
            </ModalProvider>
          </WebSocketProvider>
        </GlobalState>
      </WalletProvider>
    </ThemeProvider>
  </BrowserRouter>
)

export default Providers
