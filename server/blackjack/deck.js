// server/blackjack/deck.js
const SUITS = ['♣', '♦', '♥', '♠'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function fresh52() {
  const cards = [];
  for (const s of SUITS) for (const r of RANKS) cards.push({ r, s });
  return cards;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function valueOf(card) {
  if (card.r === 'A') return 11;
  if (['K','Q','J'].includes(card.r)) return 10;
  return Number(card.r);
}

function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += valueOf(c);
    if (c.r === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10; // cuenta A como 1
    aces--;
  }
  return total;
}

module.exports = {
  fresh52,
  shuffle,
  valueOf,
  handValue,
};
