// client/src/context/websocket/WebsocketProvider.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import SocketContext from './socketContext';
import { CS_DISCONNECT } from '../../pokergame/actions';

const BASE = (process.env.REACT_APP_SOCKET_URL || 'http://localhost:7777').replace(/\/$/, '');

function connectNS(ns, token) {
  const opts = {
    path: '/socket.io',
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
    ...(token ? { auth: { token } } : {}),
  };
  return io(`${BASE}${ns}`, opts);
}

export default function WebsocketProvider({ children }) {
  // (opcional) token sólo en prod
  const token = useMemo(
    () => (process.env.NODE_ENV === 'production' ? localStorage.getItem('token') || undefined : undefined),
    []
  );

  // sockets por namespace
  const lobby = useMemo(() => connectNS('/lobby', token), [token]);
  const poker = useMemo(() => connectNS('/poker', token), [token]);
  const blackjack = useMemo(() => connectNS('/blackjack', token), [token]);

  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const onConnect = () => setSocketId(lobby.id);
    const onConnectError = (err) => console.error('[socket][lobby] connect_error:', err?.message || err);
    const onDisconnect = (reason) => console.warn('[socket][lobby] disconnect:', reason);

    lobby.on('connect', onConnect);
    lobby.on('connect_error', onConnectError);
    lobby.on('disconnect', onDisconnect);

    const handleBeforeUnload = () => {
      try { lobby.emit(CS_DISCONNECT); } catch {}
      try { lobby.close(); } catch {}
      try { poker.close(); } catch {}
      try { blackjack.close(); } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      try { lobby.emit(CS_DISCONNECT); } catch {}
      try { lobby.close(); } catch {}
      try { poker.close(); } catch {}
      try { blackjack.close(); } catch {}

      lobby.off('connect', onConnect);
      lobby.off('connect_error', onConnectError);
      lobby.off('disconnect', onDisconnect);
    };
  }, [lobby, poker, blackjack]);

  const cleanUp = useCallback(() => {
    try { lobby.emit(CS_DISCONNECT); } catch {}
    try { lobby.close(); } catch {}
    try { poker.close(); } catch {}
    try { blackjack.close(); } catch {}
  }, [lobby, poker, blackjack]);

  return (
    <SocketContext.Provider value={{ lobby, poker, blackjack, socketId, cleanUp }}>
      {children}
    </SocketContext.Provider>
  );
}
