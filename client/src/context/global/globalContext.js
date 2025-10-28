// client/src/context/global/globalContext.js
import { createContext, useContext } from 'react';

/**
 * Tipado/shape por defecto para autocompletado y evitar undefined.
 * No es obligatorio pero ayuda a DX.
 */
export const defaultGlobalState = {
  // Usuario / sesión
  isLoading: true,
  walletAddress: '',
  addressEns: null,

  // Lobby & juego
  selectedGame: 'poker', // 'poker' | 'blackjack'
  selectedTableId: null,
  tablesByGame: { poker: [], blackjack: [] },
  playersOnline: [],

  // Setters / actions (se sobreescriben desde el Provider)
  setIsLoading: () => {},
  setWalletAddress: () => {},
  setAddressEns: () => {},
  setSelectedGame: () => {},
  setSelectedTableId: () => {},
  setTablesForGame: () => {},
  setPlayersOnline: () => {},
  resetLobby: () => {},
  resetAll: () => {},
};

const GlobalContext = createContext(defaultGlobalState);

/** Hook de conveniencia */
export const useGlobal = () => useContext(GlobalContext);

export default GlobalContext;
