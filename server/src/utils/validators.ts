import { Game, Player, Card, Suit } from '../types';
import logger from './logger';

export class GameValidator {
  static canPlayCard(game: Game, player: Player, card: Card): boolean {
    logger.info("-----------canPlayCard-----------")
    logger.info(`Game status: ${game.status}`)
    logger.info(`Current turn: ${game.currentTurn}, Player ID: ${player.id}`)
    logger.info(`Card to play: ${JSON.stringify(card)}`)
    logger.info(`Player cards: ${JSON.stringify(player.cards)}`)
    logger.info(`Current trick: ${JSON.stringify(game.currentTrick)}`)
    
    if (game.status !== "PLAYING") {
      logger.info("❌ Game status is not PLAYING")
      return false;
    }
    if (game.currentTurn !== player.id) {
      logger.info("❌ Not player's turn")
      return false;
    }
    if (!player.cards.some(c => c.suit === card.suit && c.value === card.value)) {
      logger.info("❌ Card not found in player's hand")
      return false;
    }
    // Its working perfect
    if (game.currentTrick && game.currentTrick.length > 0) {
      const leadSuit = game.currentTrick[0].suit;
      const hasLeadSuit = player.cards.some(c => c.suit === leadSuit);
      if (hasLeadSuit && card.suit !== leadSuit) {
        logger.info(`❌ Must follow lead suit ${leadSuit}, but played ${card.suit}`)
        return false;
      }
    }
    logger.info("✅ Card play is valid")
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