import { Game, Player, Card, Suit } from '../types';

export class GameValidator {
  static canPlayCard(game: Game, player: Player, card: Card): boolean {
    // Implement card play validation logic
    return true;
  }

  static isValidBid(game: Game, bid: number): boolean {
    // Implement bid validation logic
    return true;
  }
}