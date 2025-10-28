// server/blackjack/table.js
const { fresh52, shuffle, handValue } = require('./deck');

class BJTable {
  constructor({ id, name='BJ Table', minBet=1000, maxPlayers=5 } = {}) {
    this.id = id;
    this.name = name;
    this.minBet = minBet;
    this.maxPlayers = maxPlayers;

    this.players = new Map(); // socketId -> { wallet, seat, stack, bet, hand, stood, busted, doubled }
    this.dealer = { hand: [] };

    this.deck = shuffle(fresh52());
    this.inHand = false;
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      type: 'blackjack',
      maxPlayers: this.maxPlayers,
      currentNumberPlayers: this.players.size,
      minBet: this.minBet,
      dealer: {
        hand: this.dealer.hand.map((c, i) => i === 0 && this.inHand ? { hidden: true } : c),
      },
      seats: Array.from(this.players.values()).map(p => ({
        seat: p.seat,
        wallet: p.wallet,
        stack: p.stack,
        bet: p.bet,
        hand: p.hand,
        stood: p.stood,
        busted: p.busted,
      })),
      inHand: this.inHand,
    };
  }

  ensureDeck() {
    if (this.deck.length < 15) this.deck = shuffle(fresh52());
  }

  dealOne() {
    this.ensureDeck();
    return this.deck.pop();
  }

  join({ socketId, wallet, seat }) {
    if (this.players.size >= this.maxPlayers) throw new Error('table full');
    if ([...this.players.values()].some(p => p.seat === seat)) throw new Error('seat taken');

    this.players.set(socketId, {
      wallet, seat,
      stack: 100000, // demo
      bet: 0,
      hand: [],
      stood: false,
      busted: false,
      doubled: false,
    });
  }

  leave(socketId) {
    this.players.delete(socketId);
    if (this.players.size === 0) this.resetHand();
  }

  placeMinBet(socketId) {
    const p = this.players.get(socketId);
    if (!p) return;
    if (p.stack < this.minBet) throw new Error('insufficient stack');
    p.stack -= this.minBet;
    p.bet += this.minBet;
  }

  startHandIfReady() {
    if (this.inHand) return;
    if (this.players.size === 0) return;

    this.inHand = true;
    this.dealer.hand = [];
    for (const p of this.players.values()) {
      p.hand = [];
      p.stood = false;
      p.busted = false;
      p.doubled = false;
      if (p.bet === 0) this.placeMinBetByTableRule(p); // opcional
    }
    // primera apuesta mínima automática
    for (const [sid] of this.players) this.placeMinBet(sid);

    // deal inicial 2 cartas a cada jugador y 2 al dealer
    for (let i = 0; i < 2; i++) {
      for (const p of this.players.values()) p.hand.push(this.dealOne());
      this.dealer.hand.push(this.dealOne());
    }
  }

  placeMinBetByTableRule(p) {
    if (p.stack >= this.minBet) { p.stack -= this.minBet; p.bet += this.minBet; }
  }

  playerHit(socketId) {
    const p = this.players.get(socketId);
    if (!this.inHand || !p || p.stood || p.busted) return;
    p.hand.push(this.dealOne());
    if (handValue(p.hand) > 21) p.busted = true;
  }

  playerStand(socketId) {
    const p = this.players.get(socketId);
    if (!this.inHand || !p) return;
    p.stood = true;
  }

  playerDouble(socketId) {
    const p = this.players.get(socketId);
    if (!this.inHand || !p || p.doubled) return;
    const extra = Math.min(p.stack, p.bet);
    p.stack -= extra;
    p.bet += extra;
    p.doubled = true;
    this.playerHit(socketId);
    this.playerStand(socketId);
  }

  // Simplificado: sin split por ahora
  playerSplit() {
    // TODO: implementar split si la primera mano son pares
  }

  allPlayersDone() {
    for (const p of this.players.values()) {
      if (!p.busted && !p.stood) return false;
    }
    return true;
  }

  dealerPlay() {
    while (handValue(this.dealer.hand) < 17) {
      this.dealer.hand.push(this.dealOne());
    }
  }

  settle() {
    const dealerVal = handValue(this.dealer.hand);
    const results = [];

    for (const p of this.players.values()) {
      const v = handValue(p.hand);
      let outcome = 'lose';
      if (p.busted) outcome = 'lose';
      else if (dealerVal > 21) outcome = 'win';
      else if (v > dealerVal) outcome = 'win';
      else if (v === dealerVal) outcome = 'push';
      else outcome = 'lose';

      if (outcome === 'win') p.stack += p.bet * 2;
      if (outcome === 'push') p.stack += p.bet; // recupera apuesta

      results.push({ seat: p.seat, wallet: p.wallet, outcome, player: v, dealer: dealerVal, stack: p.stack });
      p.bet = 0;
    }

    this.inHand = false;
    return { dealer: dealerVal, results };
  }

  resetHand() {
    this.inHand = false;
    this.dealer.hand = [];
    for (const p of this.players.values()) {
      p.hand = [];
      p.bet = 0;
      p.busted = false;
      p.stood = false;
      p.doubled = false;
    }
  }
}

module.exports = BJTable;
