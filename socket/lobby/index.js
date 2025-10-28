const {
  CS_FETCH_LOBBY_INFO,
  SC_RECEIVE_LOBBY_INFO,
  SC_TABLES_UPDATED,
} = require('../../pokergame/actions');

// Interfaces mínimas de los módulos de juego
const pokerNS = safeRequire('../poker');         // debe exponer listTables()
const blackjackNS = safeRequire('../blackjack'); // idem

function safeRequire(p) {
  try { return require(p); } catch { return null; }
}

function getTablesByGame(game) {
  const g = (game || 'poker').toLowerCase();
  if (g === 'blackjack') return blackjackNS?.listTables?.() || [];
  return pokerNS?.listTables?.() || [];
}

exports.init = (socket /*, ns */) => {
  socket.on(CS_FETCH_LOBBY_INFO, (payload = {}) => {
    const { game = 'poker' } = payload;
    const tables = getTablesByGame(game);
    const players = []; // si quieres, arma un contador real por juego
    socket.emit(SC_RECEIVE_LOBBY_INFO, { game, tables, players });
  });

  // Si luego quieres “push” en tiempo real:
  // algún servicio podría emitir SC_TABLES_UPDATED con { game, tables, players }
  // socket.emit(SC_TABLES_UPDATED, { ... })
};
