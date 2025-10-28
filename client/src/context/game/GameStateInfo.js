
import React from 'react';
import { InfoPill } from './InfoPill';

export function GameStateInfo({ currentTable }) {
  if (!currentTable) return null;

  // Detecta BJ por presencia de dealer/players; poker por seats
  const isBlackjack =
    Array.isArray(currentTable?.players) || currentTable?.dealer != null;

  if (isBlackjack) {
    const players = currentTable?.players ?? [];
    const stage = currentTable?.stage ?? '-';
    const minBet = currentTable?.minBet ?? currentTable?.limit ?? 0;
    return (
      <InfoPill>
        Players: {players.length} • Stage: {stage} • Min bet: {minBet}
      </InfoPill>
    );
  }

  // Poker
  const seats = currentTable?.seats ?? [];
  const seated = seats.filter(Boolean).length;
  const pot = currentTable?.pot ?? 0;
  const toCall = currentTable?.callAmount ?? 0;
  const minBet = currentTable?.minBet ?? 0;
  return (
    <InfoPill>
      Players: {seated}/{seats.length} • Pot: {pot} • To call: {toCall} • Min bet: {minBet}
    </InfoPill>
  );
}
