'use strict'

const Table = require('../pokergame/Table')
const Player = require('../pokergame/Player')
const config = require('../config')
const {
  CS_FETCH_LOBBY_INFO,
  SC_RECEIVE_LOBBY_INFO,
  SC_PLAYERS_UPDATED,
  CS_JOIN_TABLE,
  SC_TABLE_JOINED,
  SC_TABLES_UPDATED,
  CS_LEAVE_TABLE,
  SC_TABLE_LEFT,
  CS_FOLD,
  CS_CHECK,
  CS_CALL,
  CS_RAISE,
  TABLE_MESSAGE,
  CS_REBUY,
  CS_STAND_UP,
  SITTING_OUT,
  SITTING_IN,
  CS_DISCONNECT,
  SC_TABLE_UPDATED,
  WINNER,
} = require('../pokergame/actions')

const ALLOW_SINGLE =
  process.env.DEV_AUTO_START === 'true' ||
  process.env.ALLOW_SINGLE_PLAYER === 'true'

const deepClone = (obj) => {
  try { return structuredClone(obj) } catch { return JSON.parse(JSON.stringify(obj)) }
}

// --- Estado global ---
const tables = { 1: new Table(1, 'Table 1', config.INITIAL_CHIPS_AMOUNT) }
const players = {}

const SHOWDOWN_PAUSE_MS = 3500;
// Helpers ------------------------------------------------------------
function firstEmptySeat(table) {
  for (let i = 1; i <= table.maxPlayers; i++) if (!table.seats[i]) return i
  return null
}
function isBot(player) {
  return typeof player?.socketId === 'string' && player.socketId.startsWith('bot-')
}
function seatById(table, seatId) { return table.seats?.[seatId] || null }

function chooseBotAction(table, seat) {
  const toCall = table.callAmount ? Math.max(0, table.callAmount - seat.bet) : 0
  if (!table.callAmount || toCall <= 0) return { type: 'handleCheck' }
  if (toCall <= Math.min(seat.stack * 0.25, table.minRaise)) return { type: 'handleCall' }
  return { type: 'handleFold' }
}

function hideOpponentCards(table, socketId) {
  const clone = deepClone(table)
  const hidden = [{ suit: 'hidden', rank: 'hidden' }, { suit: 'hidden', rank: 'hidden' }]
  for (let i = 1; i <= clone.maxPlayers; i++) {
    const seat = clone.seats[i]
    if (
      seat && seat.hand?.length &&
      seat.player.socketId !== socketId &&
      !(seat.lastAction === WINNER && clone.wentToShowdown)
    ) seat.hand = hidden
  }
  return clone
}

function buildHandResult(table) {
  if (!table.handOver) return null
  return {
    messages: table.winMessages.slice(),        // p.ej. ["Alice wins $7500.00 with Two Pair"]
    board: table.board.slice(),
    wentToShowdown: table.wentToShowdown,
  }
}

// Broadcast estado a cada jugador (con cartas ocultas y, si aplica, handResult)
function broadcastToTable(io, table, message = null) {
  if (!table) return
  const handResult = buildHandResult(table)
  for (const p of table.players) {
    const snapshot = hideOpponentCards(table, p.socketId)
    console.log('[SC_TABLE_UPDATED] to:', p.socketId, {
      message,
      handOver: table.handOver,
      wentToShowdown: table.wentToShowdown,
      handResult,
    });
    io.to(p.socketId).emit(SC_TABLE_UPDATED, { table: snapshot, message, handResult })
  }
}

function scheduleBotTurn(io, table, delay = 900) {
  const turnSeat = seatById(table, table.turn)
  if (!turnSeat || !isBot(turnSeat.player) || table.handOver) return
  setTimeout(() => {
    const act = chooseBotAction(table, turnSeat)
    if (act.type === 'handleRaise') {
      const target = Math.max(table.callAmount || table.minBet, table.minRaise)
      table[act.type](turnSeat.player.socketId, target)
    } else {
      table[act.type](turnSeat.player.socketId)
    }
    broadcastToTable(io, table)
    table.changeTurn(table.turn)
    broadcastToTable(io, table)
    if (table.handOver) initNewHand(io, table)
    else scheduleBotTurn(io, table)
  }, delay)
}

function initNewHand(io, table) {
  const canStart = ALLOW_SINGLE ? table.activePlayers().length >= 1 : table.activePlayers().length > 1
  if (!canStart) return
  table.clearWinMessages()
  table.startHand()
  console.log('[NEW_HAND] started; broadcasting banner');
  broadcastToTable(io, table, '--- New hand started ---')
  scheduleBotTurn(io, table, 700)
}

// -------------------------------------------------------------------

module.exports.init = (socket, io) => {
  console.log(`[SOCKET] Connected ${socket.id}`)

  // --- LOBBY INFO ---
  socket.on(CS_FETCH_LOBBY_INFO, ({ walletAddress, username }) => {
    const addr = socket.user?.address || walletAddress || `guest_${socket.id.slice(0, 4)}`
    const displayName = username || `player_${addr.slice(2, 6)}`
    players[socket.id] = new Player(socket.id, addr, displayName, config.INITIAL_CHIPS_AMOUNT)

    socket.emit(SC_RECEIVE_LOBBY_INFO, {
      tables: Object.values(tables).map(t => ({
        id: t.id, name: t.name, limit: t.limit, maxPlayers: t.maxPlayers, currentNumberPlayers: t.players.length
      })),
      players: Object.values(players).map(p => ({ socketId: p.socketId, id: p.id, name: p.name, bankroll: p.bankroll })),
      amount: config.INITIAL_CHIPS_AMOUNT,
      socketId: socket.id,
    })
  })

  // --- JOIN TABLE ---
  socket.on(CS_JOIN_TABLE, (tableId) => {
    const table = tables[tableId]
    if (!table) return
    if (!table) return
    let player = players[socket.id]
    if (!player) {
      // Rehidrata/crea un jugador “guest” si llega un JOIN sin haber hecho FETCH_LOBBY
      const addr = socket.user?.address || `guest_${socket.id.slice(0, 4)}`
      const name = `player_${addr.slice(2, 6)}`
      player = new Player(socket.id, addr, name, config.INITIAL_CHIPS_AMOUNT)
      players[socket.id] = player
    }

    table.addPlayer(player)
    const seatId = firstEmptySeat(table)
    if (seatId) {
      table.sitPlayer(player, seatId, table.limit)
      player.bankroll -= table.limit
    }

    // Bot single-player
    if (ALLOW_SINGLE && table.activePlayers().length === 1) {
      const botId = `bot-${tableId}`
      if (!players[botId]) {
        const bot = new Player(botId, botId, 'Bot', config.INITIAL_CHIPS_AMOUNT)
        players[botId] = bot
        table.addPlayer(bot)
        const freeSeat = firstEmptySeat(table)
        if (freeSeat) table.sitPlayer(bot, freeSeat, table.limit)
      }
    }

    socket.emit(SC_TABLE_JOINED, { tableId, seatId })
    socket.broadcast.emit(SC_TABLES_UPDATED, [{
      id: table.id, name: table.name, limit: table.limit, maxPlayers: table.maxPlayers, currentNumberPlayers: table.players.length
    }])

    broadcastToTable(io, table, `${player.name} joined table`)
    initNewHand(io, table)
  })

  // --- LEAVE TABLE ---
  socket.on(CS_LEAVE_TABLE, (tableId) => {
    const table = tables[tableId]
    const player = players[socket.id]
    if (!table || !player) return

    const mySeat = Object.values(table.seats).find(s => s && s.player.socketId === socket.id)
    if (mySeat) player.bankroll += mySeat.stack

    table.removePlayer(socket.id)
    socket.emit(SC_TABLE_LEFT, { tableId })
    socket.broadcast.emit(SC_TABLES_UPDATED, [{
      id: table.id, name: table.name, limit: table.limit, maxPlayers: table.maxPlayers, currentNumberPlayers: table.players.length
    }])
  })

  // --- CHAT opcional ---
  socket.on(TABLE_MESSAGE, ({ message, tableId }) => {
    const table = tables[tableId]
    broadcastToTable(io, table, message)
  })

  // --- REBUY / STAND UP (básico) ---
  socket.on(CS_REBUY, ({ tableId, seatId, amount }) => {
    const table = tables[tableId]
    const player = players[socket.id]
    if (!table || !player) return
    table.rebuyPlayer(seatId, amount)
    player.bankroll -= amount
    broadcastToTable(io, table)
  })

  socket.on(CS_STAND_UP, (tableId) => {
    const table = tables[tableId]
    const player = players[socket.id]
    if (!table || !player) return
    const seat = Object.values(table.seats).find(s => s && s.player.socketId === socket.id)
    if (seat) player.bankroll += seat.stack
    table.standPlayer(socket.id)
    broadcastToTable(io, table, `${player.name} left the table`)
  })

  // --- ACCIONES ---
  const handleAction = (tableId, action, amount) => {
    const table = tables[tableId]
    if (!table) return
    const res = amount != null
      ? table[action](socket.id, amount)
      : table[action](socket.id)
    if (!res) return

    broadcastToTable(io, table, res.message)
    table.changeTurn(res.seatId)
    broadcastToTable(io, table)
    if (table.handOver) {
      // Mostramos ganador (ya se envió en broadcastToTable de arriba)
      setTimeout(() => initNewHand(io, table), SHOWDOWN_PAUSE_MS);
    } else {
      scheduleBotTurn(io, table);
    }
  }

  socket.on(CS_FOLD, (id) => handleAction(id, 'handleFold'))
  socket.on(CS_CHECK, (id) => handleAction(id, 'handleCheck'))
  socket.on(CS_CALL, (id) => handleAction(id, 'handleCall'))
  socket.on(CS_RAISE, ({ tableId, amount }) => handleAction(tableId, 'handleRaise', amount))
  socket.on(CS_DISCONNECT, () => {
    try {
      Object.values(tables).forEach((t) => t.removePlayer(socket.id))
      delete players[socket.id]
    } catch (e) {
      console.warn('[CS_DISCONNECT] cleanup error', e)
    }
  })
}
