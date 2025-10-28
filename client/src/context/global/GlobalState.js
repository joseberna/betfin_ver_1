import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GlobalContext, { defaultGlobalState } from './globalContext';
import { useAccount } from 'wagmi';

/**
 * Provider global para estado de lobby/sesión multi-juego (poker/blackjack).
 * - Mantiene walletAddress en sincronía con wagmi.
 * - Soporta múltiples juegos con un mapa tablesByGame.
 * - Expone helpers de reseteo para flujos de "Leave", "Disconnect" y cambios de juego.
 */
const GlobalState = ({ children }) => {
  // ---- Estado base
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(defaultGlobalState.walletAddress);
  const [addressEns, setAddressEns] = useState(null);

  // Multi-juego
  const [selectedGame, setSelectedGame] = useState(
    () => sessionStorage.getItem('selectedGame') || 'poker'
  );
  const [selectedTableId, setSelectedTableId] = useState(null);

  // Estructura por juego
  const [tablesByGame, setTablesByGame] = useState({ poker: [], blackjack: [] });
  const [playersOnline, setPlayersOnline] = useState([]);

  // ---- Wagmi
  const { address, isConnected } = useAccount();

  // Sincroniza walletAddress con wagmi
  useEffect(() => {
    if (isConnected && address) setWalletAddress(address);
    else setWalletAddress('');
  }, [isConnected, address]);

  // Persiste el juego elegido para UX
  useEffect(() => {
    sessionStorage.setItem('selectedGame', selectedGame);
  }, [selectedGame]);

  // ---- Helpers
  const setTablesForGame = useCallback((game, tables) => {
    setTablesByGame(prev => ({ ...prev, [game]: Array.isArray(tables) ? tables : [] }));
  }, []);

  const resetLobby = useCallback(() => {
    setSelectedTableId(null);
    setTablesByGame(prev => ({ ...prev, [selectedGame]: [] }));
    setPlayersOnline([]);
  }, [selectedGame]);

  const resetAll = useCallback(() => {
    setIsLoading(true);
    setSelectedTableId(null);
    setTablesByGame({ poker: [], blackjack: [] });
    setPlayersOnline([]);
    setSelectedGame('poker');
    setAddressEns(null);
  }, []);

  const value = useMemo(
    () => ({
      // Estado
      isLoading,
      walletAddress,
      addressEns,
      selectedGame,
      selectedTableId,
      tablesByGame,
      playersOnline,

      // Setters / actions
      setIsLoading,
      setWalletAddress,
      setAddressEns,
      setSelectedGame,
      setSelectedTableId,
      setTablesForGame,
      setPlayersOnline,

      // Helpers
      resetLobby,
      resetAll,
    }),
    [
      isLoading,
      walletAddress,
      addressEns,
      selectedGame,
      selectedTableId,
      tablesByGame,
      playersOnline,
      setTablesForGame,
      resetLobby,
      resetAll,
    ]
  );

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export default GlobalState;
