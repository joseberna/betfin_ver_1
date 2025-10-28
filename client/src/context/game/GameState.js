// client/src/context/game/GameState.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socketContext from '../websocket/socketContext';
import GameContext from './gameContext';

// Actions compartidos que realmente usa tu server hoy
import {
  // Poker
  CS_JOIN_TABLE, CS_LEAVE_TABLE, CS_CALL, CS_CHECK, CS_FOLD, CS_RAISE,
  SC_TABLE_JOINED, SC_TABLE_LEFT, SC_TABLE_UPDATED,
  // Blackjack
  // (join/leave comparten nombres; estado/resultado difieren)
} from '../../pokergame/actions';

const GameState = ({ children }) => {
  const { poker, blackjack } = useContext(socketContext);
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [currentTable, setCurrentTable] = useState(null);
  const [seatId, setSeatId] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [gameType, setGameType] = useState(null); // 'poker' | 'blackjack'

  const tableRef = useRef(null);
  useEffect(() => { tableRef.current = currentTable; }, [currentTable]);

  // ---------- Poker ----------
  useEffect(() => {
    if (!poker) return;

    const onPokerUpdated = ({ table, message, handResult }) => {
      setGameType('poker');
      if (table) setCurrentTable(table);
      if (message) setMessages(prev => [...prev, message]);
      if (handResult) setLastResult(handResult);
    };

    const onPokerJoined = ({ table, seatId: mySeat }) => {
      setGameType('poker');
      if (table) setCurrentTable(table);
      if (typeof mySeat === 'number') setSeatId(mySeat);
    };

    const onPokerLeft = () => {
      setCurrentTable(null);
      setSeatId(null);
      setMessages([]);
      setLastResult(null);
      navigate('/lobby', { replace: true });
    };

    poker.on(SC_TABLE_UPDATED, onPokerUpdated);
    poker.on(SC_TABLE_JOINED, onPokerJoined);
    poker.on(SC_TABLE_LEFT, onPokerLeft);

    return () => {
      poker.off(SC_TABLE_UPDATED, onPokerUpdated);
      poker.off(SC_TABLE_JOINED, onPokerJoined);
      poker.off(SC_TABLE_LEFT, onPokerLeft);
    };
  }, [poker, navigate]);

  // ---------- Blackjack ----------
  useEffect(() => {
    if (!blackjack) return;

    const onBJUpdate = ({ table }) => {
      setGameType('blackjack');
      if (table) setCurrentTable(table);
    };
    const onBJResult = (payload) => setLastResult(payload);

    // tu server emite SC_TABLE_UPDATED y SC_HAND_RESULT
    blackjack.on('SC_TABLE_UPDATED', onBJUpdate);
    blackjack.on('SC_HAND_RESULT', onBJResult);

    return () => {
      blackjack.off('SC_TABLE_UPDATED', onBJUpdate);
      blackjack.off('SC_HAND_RESULT', onBJResult);
    };
  }, [blackjack]);

  // ---------- API ----------
  const joinTable = (tableId, type = 'poker') => {
    setGameType(type);
    if (type === 'blackjack') {
      blackjack?.emit('CS_TABLE_JOIN', { tableId });
    } else {
      poker?.emit(CS_JOIN_TABLE, { tableId });
    }
  };

  const leaveTable = () => {
    const id = tableRef.current?.id;
    if (!id) return;

    if (gameType === 'blackjack') {
      blackjack?.emit('CS_TABLE_LEAVE', { tableId: id });
    } else {
      poker?.emit(CS_LEAVE_TABLE, { tableId: id });
    }

    setCurrentTable(null);
    setSeatId(null);
    setMessages([]);
    setLastResult(null);
    navigate('/lobby', { replace: true });
  };

  // Poker actions
  const fold  = () => { const id = tableRef.current?.id; if (id) poker?.emit(CS_FOLD,  { tableId: id }); };
  const check = () => { const id = tableRef.current?.id; if (id) poker?.emit(CS_CHECK, { tableId: id }); };
  const call  = () => { const id = tableRef.current?.id; if (id) poker?.emit(CS_CALL,  { tableId: id }); };
  const raise = (amount) => { const id = tableRef.current?.id; if (id) poker?.emit(CS_RAISE, { tableId: id, amount }); };

  // (Si necesitas exponer acciones de BJ, hazlo desde BlackjackPlay directamente con CS_BJ_ACTION)

  // ---------- Provider ----------
  return (
    <GameContext.Provider
      value={{
        messages,
        currentTable: currentTable || null,
        seatId: seatId ?? null,
        lastResult: lastResult || null,
        gameType,
        joinTable,
        leaveTable,
        fold, check, call, raise,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameState;
