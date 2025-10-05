import { Game, Player, Card, Suit } from '../types';
import logger from './logger';

export class GameValidator {
  static canPlayCard(game: Game, player: Player, card: Card): boolean {
    logger.info("-----------canPlayCard-----------")
    if (game.status !== "PLAYING") return false;
    if (game.currentTurn !== player.id) return false;
    if (!player.cards.some(c => c.suit === card.suit && c.value === card.value)) return false;
    // Its working perfect
    if (game.currentTrick && game.currentTrick.length > 0) {
      const leadSuit = game.currentTrick[0].suit;
      const hasLeadSuit = player.cards.some(c => c.suit === leadSuit);
      if (hasLeadSuit && card.suit !== leadSuit) return false;
    }
    return true;
  }

  static isValidBid(game: Game, player: Player, bid: number): boolean {
    if (game.status !== "BIDDING") return false;
    if (game.currentTurn !== player.id) return false;
    if (bid < 0 || bid > game.currentRound + 1) return false;

    // Last bidder rule
    const bidsPlaced = game.players.filter(p => typeof p.currentBid === "number" && p.currentBid >= 0);
    if (bidsPlaced.length === game.players.length - 1) {
      const sumOfPreviousBids = game.players.reduce((sum, p) => {
        if (p.id !== player.id && typeof p.currentBid === "number" && p.currentBid >= 0) {
          return sum + p.currentBid;
        }
        return sum;
      }, 0);
      if (sumOfPreviousBids + bid === game.currentRound) return false;
    }
    return true;
  }
}