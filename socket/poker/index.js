// server/socket/poker/index.js
const { nanoid } = require('nanoid');
const {
  // Eventos usados por el frontend
  CS_JOIN_TABLE, CS_LEAVE_TABLE,
  CS_SIT_DOWN, CS_STAND_UP,
  CS_CHECK, CS_CALL, CS_FOLD, CS_RAISE,
  SC_TABLE_JOINED, SC_TABLE_LEFT, SC_TABLE_UPDATED,
} = require('../../pokergame/actions');

// Registro en memoria de las mesas
const tables = new Map();

// Crea una mesa demo inicial
function ensureDemoTables() {
  if (!tables.has(1)) {
    tables.set(1, {
      id: 1,
      name: 'Poker Table 1',
      seats: Array(5).fill(null), // { socketId, username }
      board: [],
      pot: 0,
      minBet: 10,
      minRaise: 20,
      callAmount: 10,
      messages: [],
    });
  }
}
ensureDemoTables();

// Devuelve lista de mesas para el lobby
function listTables() {
  return Array.from(tables.values()).map(t => ({
    id: t.id,
    name: t.name,
    type: 'poker',
    maxPlayers: t.seats.length,
    currentNumberPlayers: t.seats.filter(Boolean).length,
    limit: t.minBet,
    smallBlind: t.minBet,
    bigBlind: t.minBet * 2,
  }));
}
exports.listTables = listTables;

// Envía el estado completo de una mesa
function emitState(ns, tableId, opts = {}) {
  const table = tables.get(Number(tableId));
  if (!table) return;
  const payload = { table };
  const room = `poker:table:${tableId}`;
  if (opts.to) ns.to(opts.to).emit(SC_TABLE_UPDATED, payload);
  else ns.to(room).emit(SC_TABLE_UPDATED, payload);
}

// Inicializa eventos de socket.io
exports.init = function init(socket, ns) {
  let joinedTableId = null;
  const room = (tid) => `poker:table:${tid}`;

  // === JOIN TABLE ===
  socket.on(CS_JOIN_TABLE, (data) => {
    const tableId = Number(data?.tableId ?? data);
    ensureDemoTables();
    const t = tables.get(tableId);
    if (!t) return;

    // salir de otras rooms
    [...socket.rooms].forEach(r => r.startsWith('poker:table:') && socket.leave(r));
    socket.join(room(tableId));
    joinedTableId = tableId;

    // auto-seat
    if (!t.seats.find(s => s?.socketId === socket.id)) {
      const idx = t.seats.findIndex(s => !s);
      if (idx !== -1) {
        t.seats[idx] = { socketId: socket.id, username: `player_${nanoid(4)}` };
      }
    }

    const seatId = t.seats.findIndex(s => s?.socketId === socket.id) + 1;
    ns.to(socket.id).emit(SC_TABLE_JOINED, { table: t, seatId });
    emitState(ns, tableId);
  });

  // === LEAVE TABLE ===
  socket.on(CS_LEAVE_TABLE, (data) => {
    const tableId = Number(data?.tableId ?? data ?? joinedTableId);
    const t = tables.get(tableId);
    if (t) {
      const idx = t.seats.findIndex(s => s?.socketId === socket.id);
      if (idx !== -1) t.seats[idx] = null;
      socket.leave(room(tableId));
      ns.to(socket.id).emit(SC_TABLE_LEFT, { tableId });
      emitState(ns, tableId);
    }
    joinedTableId = null;
  });

  // === SIT DOWN ===
  socket.on(CS_SIT_DOWN, ({ tableId, seatNumber }) => {
    const t = tables.get(Number(tableId));
    if (!t) return;
    const ix = (seatNumber ?? 1) - 1;
    if (!t.seats[ix]) {
      t.seats[ix] = { socketId: socket.id, username: `player_${nanoid(4)}` };
      emitState(ns, t.id);
    }
  });

  // === STAND UP ===
  socket.on(CS_STAND_UP, ({ tableId }) => {
    const t = tables.get(Number(tableId ?? joinedTableId));
    if (!t) return;
    const ix = t.seats.findIndex(s => s?.socketId === socket.id);
    if (ix !== -1) {
      t.seats[ix] = null;
      emitState(ns, t.id);
    }
  });

  // === ACCIONES MOCK ===
  socket.on(CS_CHECK, () => joinedTableId && emitState(ns, joinedTableId));
  socket.on(CS_CALL,  () => joinedTableId && emitState(ns, joinedTableId));
  socket.on(CS_FOLD,  () => joinedTableId && emitState(ns, joinedTableId));
  socket.on(CS_RAISE, () => joinedTableId && emitState(ns, joinedTableId));

  // === DISCONNECT ===
  socket.on('disconnect', () => {
    if (!joinedTableId) return;
    const t = tables.get(joinedTableId);
    if (t) {
      const ix = t.seats.findIndex(s => s?.socketId === socket.id);
      if (ix !== -1) t.seats[ix] = null;
      emitState(ns, joinedTableId);
    }
  });
};
