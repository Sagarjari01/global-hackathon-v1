import { Card, Suit } from '../types';

export class CardModel {
  static createDeck(): Card[] {
    const deck: Card[] = [];
    const suits = [Suit.SPADES, Suit.DIAMONDS, Suit.CLUBS, Suit.HEARTS];
    
    for (const suit of suits) {
      for (let value = 2; value <= 14; value++) {
        deck.push({ suit, value });
      }
    }
    
    return deck;
  }

  static compareCards(card1: Card, card2: Card, trumpSuit: Suit): number {
    if (card1.suit === trumpSuit && card2.suit !== trumpSuit) return 1;
    if (card1.suit !== trumpSuit && card2.suit === trumpSuit) return -1;
    if (card1.suit === card2.suit) return card1.value - card2.value;
    return 0;
  }
}