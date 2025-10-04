import { Player, Card, Suit } from '../types';

export class AIPlayerService {
  calculateBid(cards: Card[], trumpSuit: Suit): number {
    let highCards = 0;
    cards.forEach(card => {
      if (card.suit === trumpSuit && card.value >= 10) highCards++;
      if (card.value >= 12) highCards++;
    });
    return Math.min(Math.ceil(highCards * 0.7), cards.length);
  }

  selectCard(
    cards: Card[],
    playedCards: Card[],
    trumpSuit: Suit,
    currentSuit?: Suit
  ): Card {
    if (currentSuit) {
      const suitCards = cards.filter(card => card.suit === currentSuit);
      if (suitCards.length > 0) {
        return this.getBestCard(suitCards, false);
      }
      const trumpCards = cards.filter(card => card.suit === trumpSuit);
      if (trumpCards.length > 0) {
        return this.getBestCard(trumpCards, true);
      }
    }
    return this.getBestCard(cards, false);
  }

  private getBestCard(cards: Card[], isWinning: boolean): Card {
    return isWinning 
      ? cards.sort((a, b) => b.value - a.value)[0]
      : cards.sort((a, b) => a.value - b.value)[0];
  }
}