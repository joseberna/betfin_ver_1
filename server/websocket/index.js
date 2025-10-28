// server/websocket/index.js (fragmento)
const { BJTable } = require('../blackjack/table');
const BJ = require('../blackjack/actions');

const blackjackTables = [
  new BJTable({ id: 100, name:'BJ Table 1', minBet: 100, maxPlayers: 5 }),
];

io.on('connection', (socket) => {
  // JOIN
  socket.on(BJ.CS_BJ_JOIN_TABLE, ({ tableId, walletAddress, username }) => {
    const t = blackjackTables.find(t => t.id===tableId);
    if (!t) return;
    socket.join(`bj:${tableId}`);
    t.join({ wallet: walletAddress, username });
    io.to(`bj:${tableId}`).emit(BJ.SC_BJ_TABLE_UPDATED, t.snapshot());
  });

  socket.on(BJ.CS_BJ_LEAVE_TABLE, ({ tableId, walletAddress }) => {
    const t = blackjackTables.find(t => t.id===tableId);
    if (!t) return;
    t.leave(walletAddress);
    socket.leave(`bj:${tableId}`);
    io.to(`bj:${tableId}`).emit(BJ.SC_BJ_TABLE_UPDATED, t.snapshot());
  });

  socket.on(BJ.CS_BJ_PLACE_BET, ({ tableId, walletAddress, amount }) => {
    const t = blackjackTables.find(t => t.id===tableId);
    if (!t) return;
    t.placeBet(walletAddress, amount);
    t.startIfReady();
    io.to(`bj:${tableId}`).emit(BJ.SC_BJ_TABLE_UPDATED, t.snapshot());
  });

  socket.on(BJ.CS_BJ_HIT, ({ tableId, walletAddress }) => {
    const t = blackjackTables.find(t => t.id===tableId);
    if (!t) return;
    t.hit(walletAddress);
    if (t.phase==='settle') {
      io.to(`bj:${tableId}`).emit(BJ.SC_BJ_RESULT, t._roundResults);
      t.resetRound();
    }
    io.to(`bj:${tableId}`).emit(BJ.SC_BJ_TABLE_UPDATED, t.snapshot());
  });

  socket.on(BJ.CS_BJ_STAND, ({ tableId, walletAddress }) => {
    const t = blackjackTables.find(t => t.id===tableId);
    if (!t) return;
    t.stand(walletAddress);
    if (t.phase==='settle') {
      io.to(`bj:${tableId}`).emit(BJ.SC_BJ_RESULT, t._roundResults);
      t.resetRound();
    }
    io.to(`bj:${tableId}`).emit(BJ.SC_BJ_TABLE_UPDATED, t.snapshot());
  });

  socket.on(BJ.CS_BJ_DOUBLE, ({ tableId, walletAddress }) => {
    const t = blackjackTables.find(t => t.id===tableId);
    if (!t) return;
    t.double(walletAddress);
    if (t.phase==='settle') {
      io.to(`bj:${tableId}`).emit(BJ.SC_BJ_RESULT, t._roundResults);
      t.resetRound();
    }
    io.to(`bj:${tableId}`).emit(BJ.SC_BJ_TABLE_UPDATED, t.snapshot());
  });
});
