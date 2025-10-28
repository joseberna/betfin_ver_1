// client/src/pages/Lobby.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

import socketContext from '../context/websocket/socketContext';
import globalContext from '../context/global/globalContext';
import {
  CS_FETCH_LOBBY_INFO,
  SC_RECEIVE_LOBBY_INFO,
  SC_TABLES_UPDATED,
  SC_PLAYERS_UPDATED,
} from '../pokergame/actions';

import DisconnectButton from '../components/buttons/DisconnectButton';

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <div style={{ opacity: 0.65, fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function TableCard({ table, onJoin, game }) {
  const sb = game === 'poker' ? (table.smallBlind ?? table.limit / 40) : null;
  const bb = game === 'poker' ? (table.bigBlind ?? (table.limit / 40) * 2) : null;

  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 16,
        padding: 16,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        background: 'rgba(255,255,255,.03)',
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{table.name}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <Stat
            label="Players"
            value={`${table.currentNumberPlayers ?? table.players ?? 0}/${table.maxPlayers ?? table.capacity ?? 0}`}
          />
          {game === 'poker' && typeof sb === 'number' && typeof bb === 'number' && (
            <Stat label="Blinds" value={`${sb} / ${bb}`} />
          )}
          {table.limit != null && <Stat label="Buy-in" value={table.limit} />}
        </div>
      </div>

      <div style={{ alignSelf: 'center' }}>
        <button
          onClick={() => onJoin(table.id)}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: 'none',
            background: '#20c997',
            color: '#051b17',
            fontWeight: 700,
            cursor: 'pointer',
            transition: '0.2s all ease-in-out',
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#1fb387')}
          onMouseOut={e => (e.currentTarget.style.background = '#20c997')}
        >
          Join
        </button>
      </div>
    </div>
  );
}

export default function Lobby() {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const { lobby } = useContext(socketContext); // namespace /lobby

  const {
    selectedGame,
    setSelectedGame,
    tablesByGame,
    setTablesForGame,
    playersOnline,
    setPlayersOnline,
    setSelectedTableId,
  } = useContext(globalContext);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lobby || !isConnected) return;

    setLoading(true);

    lobby.emit(CS_FETCH_LOBBY_INFO, {
      game: selectedGame, // 'poker' | 'blackjack'
      walletAddress: address,
      username: address ? `player_${address.slice(2, 6)}` : undefined,
    });

    const onLobby = (data) => {
      if (Array.isArray(data?.tables)) setTablesForGame(selectedGame, data.tables);
      if (Array.isArray(data?.players)) setPlayersOnline(data.players);
      setLoading(false);
    };

    lobby.on(SC_RECEIVE_LOBBY_INFO, onLobby);
    lobby.on(SC_TABLES_UPDATED, onLobby);
    lobby.on(SC_PLAYERS_UPDATED, setPlayersOnline);

    return () => {
      lobby.off(SC_RECEIVE_LOBBY_INFO, onLobby);
      lobby.off(SC_TABLES_UPDATED, onLobby);
      lobby.off(SC_PLAYERS_UPDATED, setPlayersOnline);
    };
  }, [lobby, isConnected, address, selectedGame, setTablesForGame, setPlayersOnline]);

  const tables = tablesByGame[selectedGame] || [];
  const sortedTables = useMemo(
    () => (Array.isArray(tables) ? [...tables].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)) : []),
    [tables]
  );

  const handleJoin = (tableId) => {
    setSelectedTableId(tableId);
    navigate(selectedGame === 'blackjack' ? '/play/blackjack' : '/play/poker', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(60% 60% at 50% 0%, #0a312c 0%, #071716 45%, #050b0a 100%)',
        color: '#e9fef9',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Bet Poker</div>
          <div style={{ opacity: 0.6, fontSize: 12 }}>
            {isConnected ? `Wallet: ${address?.slice(0, 6)}…${address?.slice(-4)}` : 'Not connected'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Stat label="Players online" value={Array.isArray(playersOnline) ? playersOnline.length : 0} />
          {isConnected && <DisconnectButton />}
        </div>
      </header>

      {/* Selector de juego */}
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '16px 24px 0',
          display: 'flex',
          gap: 8,
        }}
      >
        {['poker', 'blackjack'].map((g) => {
          const active = selectedGame === g;
          return (
            <button
              key={g}
              onClick={() => setSelectedGame(g)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: `1px solid ${active ? '#20c997' : 'rgba(255,255,255,.15)'}`,
                background: active ? '#0f3c36' : 'transparent',
                color: '#e9fef9',
                cursor: 'pointer',
              }}
            >
              {g === 'poker' ? 'Poker' : 'Blackjack'}
            </button>
          );
        })}
      </div>

      {/* Contenido principal */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
        <h2 style={{ margin: '8px 0 16px 0' }}>
          {selectedGame === 'blackjack' ? 'Blackjack tables' : 'Poker tables'}
        </h2>

        {loading && <div style={{ opacity: 0.7, fontSize: 14 }}>Loading lobby…</div>}

        {!loading && sortedTables.length === 0 && (
          <div style={{ opacity: 0.7, fontSize: 14 }}>No tables available.</div>
        )}

        <div style={{ display: 'grid', gap: 14 }}>
          {sortedTables.map((t) => (
            <TableCard key={t.id} table={t} onJoin={handleJoin} game={selectedGame} />
          ))}
        </div>
      </main>
    </div>
  );
}
