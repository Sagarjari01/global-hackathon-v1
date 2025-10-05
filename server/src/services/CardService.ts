import { Card } from '../types';
import { CardModel } from '../models/Card';

export class CardService {
  private deck: Card[];

  constructor() {
    this.deck = CardModel.createDeck();
  }

  shuffle(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCards(numPlayers: number, cardsPerPlayer: number): Card[][] {
    const hands: Card[][] = Array(numPlayers).fill([]).map(() => []);
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let j = 0; j < numPlayers; j++) {
        if (this.deck.length > 0) {
          hands[j].push(this.deck.pop()!);
        }
      }
    }
    return hands;
  }
}