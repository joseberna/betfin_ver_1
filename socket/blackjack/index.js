// socket/blackjack/index.js
const {
  CS_BJ_JOIN_TABLE,
  CS_BJ_LEAVE_TABLE,
  CS_BJ_PLACE_BET,
  CS_BJ_HIT,
  CS_BJ_STAND,
  CS_BJ_DOUBLE,
  CS_BJ_SPLIT,
  SC_BJ_TABLE_UPDATED,
  SC_BJ_RESULT,
} = require('../../pokergame/actions');

const A = require('../../server/blackjack/actions');
const BJTable = require('../../server/blackjack/table');

const tables = new Map();

function ensureDemoTables() {
  if (!tables.has(1)) {
    tables.set(1, new BJTable({
      id: 1,
      name: 'Blackjack Table 1',
      minBet: 1000,
      maxPlayers: 5,
    }));
  }
}
ensureDemoTables();

function snapshot(tableId) {
  const t = tables.get(Number(tableId));
  return t ? t.snapshot() : null;
}

function listTables() {
  return Array.from(tables.values()).map(t => ({
    id: t.id,
    name: t.name,
    type: 'blackjack',
    maxPlayers: t.maxPlayers,
    currentNumberPlayers: t.players.size,
    limit: t.minBet,
  }));
}
exports.listTables = listTables;
exports.tableSnapshot = snapshot;

exports.init = (socket, ns) => {
  const room = (id) => `blackjack:table:${id}`;

  socket.on(CS_BJ_JOIN_TABLE, ({ tableId, seat }) => {
    const t = tables.get(Number(tableId));
    if (!t) return;

    try {
      t.join({
        socketId: socket.id,
        wallet: socket?.auth?.wallet,
        seat: seat ?? (t.players.size + 1),
      });

      // entrar al room y asegurar mano si corresponde
      [...socket.rooms].forEach(r => r.startsWith('blackjack:table:') && socket.leave(r));
      socket.join(room(t.id));
      t.startHandIfReady?.();

      ns.to(socket.id).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
      ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
    } catch (e) {
      ns.to(socket.id).emit('SC_ERROR', { message: e?.message || 'join failed' });
    }
  });

  socket.on(CS_BJ_LEAVE_TABLE, ({ tableId }) => {
    const t = tables.get(Number(tableId));
    if (!t) return;
    t.leave(socket.id);
    socket.leave(room(t.id));
    ns.to(socket.id).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
    ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
  });

  socket.on(CS_BJ_PLACE_BET, ({ tableId, amount }) => {
    const t = tables.get(Number(tableId));
    if (!t) return;
    t.placeBet(socket.id, Number(amount) || 0);
    ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
  });

  socket.on(CS_BJ_HIT, ({ tableId }) => {
    const t = tables.get(Number(tableId));
    if (!t) return;
    t.playerHit(socket.id);
    if (t.allPlayersDone()) {
      t.dealerPlay();
      const result = t.settle();
      ns.to(room(t.id)).emit(SC_BJ_RESULT, result);
    }
    ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
  });

  socket.on(CS_BJ_STAND, ({ tableId }) => {
    const t = tables.get(Number(tableId));
    if (!t) return;
    t.playerStand(socket.id);
    if (t.allPlayersDone()) {
      t.dealerPlay();
      const result = t.settle();
      ns.to(room(t.id)).emit(SC_BJ_RESULT, result);
    }
    ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
  });

  socket.on(CS_BJ_DOUBLE, ({ tableId }) => {
    const t = tables.get(Number(tableId));
    if (!t) return;
    t.playerDouble(socket.id);
    if (t.allPlayersDone()) {
      t.dealerPlay();
      const result = t.settle();
      ns.to(room(t.id)).emit(SC_BJ_RESULT, result);
    }
    ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
  });

  socket.on(CS_BJ_SPLIT, ({ tableId }) => {
    const t = tables.get(Number(tableId));
    if (!t || !t.playerSplit) return;
    t.playerSplit(socket.id);
    ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
  });

  socket.on('disconnect', () => {
    for (const t of tables.values()) {
      if (t.players.has(socket.id)) {
        t.leave(socket.id);
        ns.to(room(t.id)).emit(SC_BJ_TABLE_UPDATED, { table: t.snapshot() });
      }
    }
  });
};
