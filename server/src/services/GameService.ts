import { Game, Player, Suit } from "../types";
import logger from "../utils/logger";
import { AIPlayerService } from "./AIPlayerService";
import { CardService } from "./CardService";
import { GameValidator } from "../utils/validators";

export class GameService {
  private games: Map<string, Game>;
  private cardService: CardService;
  private aiService: AIPlayerService;

  constructor() {
    this.games = new Map();
    this.cardService = new CardService();
    this.aiService = new AIPlayerService();
  }

  createGameWithAI(totalRounds: number, playerName: string): Game {
    logger.info("-----------------createGameWithAI()-----------------");
    const game = this.createGame(totalRounds);

    // Add human player with fixed ID
    this.addPlayer(game.id, playerName, "player-1");

    // Add AI players
    for (let i = 1; i <= 3; i++) {
      this.addAIPlayer(game.id, `AI Player ${i}`);
    }

    this.startRound(game.id);

    game.currentTurn = game.players[0].id;
    return game;
  }

  private addAIPlayer(gameId: string, name: string): Player {
    logger.info("-----------------addAIPlayer()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const aiPlayer: Player = {
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      name,
      cards: [],
      score: 0,
      isAI: true,
      currentBid: -1,
    };

    game.players.push(aiPlayer);
    return aiPlayer;
  }

  startGame(gameId: string): void {
    logger.info("-----------------startGame()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    game.status = "BIDDING";
    game.currentTurn = game.players[0].id;
    this.startRound(gameId);
  }

  playAITurns(gameId: string) {
    logger.info("-----------------playAITurns()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");
    // let maxTurns = game.players.length; // Safety counter

    while (true) {
      const currentPlayer = game.players.find((p) => p.id === game.currentTurn);
      if (!currentPlayer?.isAI || game.turnCount >= game.players.length) break;

      // const currentPlayer = game.players.find((p) => p.id === game.currentTurn);
      // if (!currentPlayer?.isAI) break;

      try {
        if (game.status === "BIDDING") {
          // Gather previous bids in order
          const previousBids = game.players
            .slice(0, game.turnCount)
            .map((p) => typeof p.currentBid === 'number' && p.currentBid >= 0 ? p.currentBid : 0);
          const isLastBidder = game.turnCount === game.players.length - 1;
          const bid = this.aiService.calculateBid(
            currentPlayer.cards,
            game.trumpSuit,
            game.currentRound,
            previousBids,
            isLastBidder
          );
          logger.info(`AI ${currentPlayer.name} bids ${bid}`);
          currentPlayer.currentBid = bid;
          game.turnCount++;

          if (game.turnCount === game.players.length) {
            game.status = "PLAYING";
            game.turnCount = 0;
            logger.info("111111111Bidding complete, moving to PLAYING phase");
            // Do NOT return here, let the API handler return the updated game state
            
          }
          this.moveToNextTurn(gameId);
        } else if (game.status === "PLAYING") {
          logger.info(`AI Player ${currentPlayer.name} is playing a card`);
          const card = this.aiService.selectCard(
            currentPlayer.cards,
            game.currentTrick || [],
            game.trumpSuit,
            game.currentSuit
          );
          logger.info(
            `AI Player ${currentPlayer.name} plays ${card.value} of ${card.suit}`
          );
          this.playCard(gameId, currentPlayer.id, card);

          // if (this.isTrickComplete(game)) {
          //   logger.info("Trick complete, evaluating trick");
          //   this.evaluateTrick(gameId);
          // } else {
          //   this.moveToNextTurn(gameId);
          // }
        }
      } catch (error) {
        logger.error(`AI Player ${currentPlayer.name} error:`, error);
        break;
      }
    }
  }
  private findWinningCard(trick: any[], trumpSuit: Suit, leadSuit: Suit): any {
    // If trick is empty, return null
    if (!trick.length) return null;

    // First check for trump cards
    const trumpCards = trick.filter((card) => card.suit === trumpSuit);
    if (trumpCards.length > 0) {
      // If there are trump cards, highest trump wins
      return trumpCards.reduce((highest, current) =>
        current.value > highest.value ? current : highest
      );
    }

    // If no trumps, check lead suit cards
    const leadSuitCards = trick.filter((card) => card.suit === leadSuit);
    if (leadSuitCards.length > 0) {
      // Highest lead suit card wins
      return leadSuitCards.reduce((highest, current) =>
        current.value > highest.value ? current : highest
      );
    }

    return trick[0];
  }
  // TODO: git rebase krvu

  private evaluateTrick(gameId: string): void {
    logger.info("-----------------evaluateTrick()-----------------");
    const game = this.getGame(gameId);
    if (!game || !game.currentTrick) return;

    const winningCard = this.findWinningCard(
      game.currentTrick,
      game.trumpSuit,
      game.currentTrick[0].suit
    );

    // logger.info("77777777777777777");
    // logger.info(JSON.stringify(winningCard));

    const winningPlayer = game.players.find(
      (p) => p.id === winningCard.playedBy
    );

    // logger.info(JSON.stringify(winningPlayer, null, 2));
    if (winningPlayer) {
      winningPlayer.tricks = (winningPlayer.tricks || 0) + 1;
      game.currentTurn = winningPlayer.id;
    }

    game.currentTrick = [];
    game.currentSuit = undefined;

    if (this.isRoundComplete(game)) {
      this.completeRound(gameId);
    }
  }

  private isRoundComplete(game: Game): boolean {
    return game.players.every((p) => p.cards.length === 0);
  }

  private completeRound(gameId: string): void {
    logger.info("-----------------completeRound()-----------------");
    const game = this.getGame(gameId);
    if (!game) return;

    // Score the round
    game.players.forEach((player) => {
      if (player.tricks === player.currentBid) {
        player.score += 10 + player.tricks;
      }
      player.tricks = 0;
      player.currentBid = 0;
    });

    if (game.currentRound < game.totalRounds) {
      game.currentRound++;
      game.status = "BIDDING";
      this.startRound(gameId);
    } else {
      // Find winner
      const winner = game.players.reduce((prev, current) =>
        prev.score > current.score ? prev : current
      );

      game.winner = winner;
      game.status = "FINISHED";

      // Reset for potential new game
      game.currentTrick = [];
      game.currentSuit = undefined;
      game.currentTurn = "";
    }
  }

  private moveToNextTurn(gameId: string): void {
    logger.info("-----------------moveToNextTurn()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");
    // logger.info(JSON.stringify(game, null, 2));
    // Add safety check for infinite loop
    if (game.players.length === 0) return;

    const currentIndex = game.players.findIndex(
      (p) => p.id === game.currentTurn
    );
    if (currentIndex === -1) {
      game.currentTurn = game.players[0].id;
      return;
    }

    const nextIndex = (currentIndex + 1) % game.players.length;
    game.currentTurn = game.players[nextIndex].id;

    // Minimize logging
    logger.info(`Turn moved from player ${currentIndex} to ${nextIndex}`);
  }

  private isBiddingComplete(game: Game): boolean {
    logger.info("-----------------isBiddingComplete()-----------------");
    const allBidsValid = game.players.every(
      (p) => typeof p.currentBid === "number" && p.currentBid >= 0
    );
    logger.info(
      `Checking bids: ${game.players
        .map((p) => `${p.name}: ${p.currentBid}`)
        .join(", ")}`
    );
    return allBidsValid;
  }

  private isTrickComplete(game: Game): boolean {
    return (game.currentTrick?.length || 0) === game.players.length;
  }

  private getTrumpSuitForRound(round: number): Suit {
    const suits = [Suit.SPADES, Suit.DIAMONDS, Suit.CLUBS, Suit.HEARTS];
    // round is 1-based, so subtract 1
    return suits[(round - 1) % suits.length];
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  addPlayer(gameId: string, playerName: string, player_id: string): Player {
    logger.info("-----------------addPlayer()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");
    if (game.players.length >= 4) throw new Error("Game is full");
    if (game.players.some((p) => p.name === playerName))
      throw new Error("Player name taken");

    // TODO: for multiplayer, currentBid should be -1 at start
    const newPlayer: Player = {
      id: player_id,
      name: playerName,
      cards: [],
      score: 0,
      currentBid: -1,
      isHost: game.players.length === 0,
    };

    game.players.push(newPlayer);
    return newPlayer;
  }

  createGame(totalRounds: number): Game {
    logger.info("-----------------createGame()-----------------");
    const game: Game = {
      id: Math.random().toString(36).substr(2, 9),
      players: [],
      currentRound: 1,
      totalRounds,
      trumpSuit: Suit.SPADES,
      cardsPerRound: 1,
      currentTurn: "",
      status: "WAITING",
      turnCount: 0,
    };

    this.games.set(game.id, game);
    return game;
  }

  startRound(gameId: string): void {
    logger.info("-----------------startRound()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    // Reset round-specific fields
    game.currentTrick = [];
    game.currentSuit = undefined;
    game.turnCount = 0;

    // Reset player round-specific fields
    game.players.forEach((player) => {
      player.tricks = 0;
      player.currentBid = -1;
    });
    
    game.trumpSuit = this.getTrumpSuitForRound(game.currentRound);

    this.cardService.shuffle();
    
    // Get the appropriate number of cards for this round
    const cardsForThisRound = this.getCardsForRound(game.currentRound, game.totalRounds);
    
    logger.info(`Round ${game.currentRound}/${game.totalRounds}: Dealing ${cardsForThisRound} cards per player`);
    
    const hands = this.cardService.dealCards(
      game.players.length,
      cardsForThisRound
    );
    
    game.players.forEach((player, index) => {
      player.cards = hands[index];
    });

    const openerIndex = (game.currentRound - 1) % game.players.length;
    game.currentTurn = game.players[openerIndex].id;
    
    game.status = "BIDDING";
  }

  getGameState(gameId: string) {
    logger.info("-----------------getGameState()-----------------");
    const game = this.getGame(gameId);
    logger.info(game);
    if (!game) throw new Error("Game not found");

    return {
      ...game,
    };
  }

  placeBid(gameId: string, playerId: string, bid: number): void {
    logger.info("-----------------placeBid()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");

    // Use GameValidator for bid validation
    if (!GameValidator.isValidBid(game, player, bid)) {
      throw new Error("Invalid bid");
    }

    const isLastBidder = game.turnCount === game.players.length - 1;
    if (isLastBidder) {
      // Calculate sum of all previous bids
      const sumOfPreviousBids = game.players.reduce((sum, p) => {
        if (p.id !== playerId && typeof p.currentBid === 'number' && p.currentBid >= 0) {
          return sum + p.currentBid;
        }
        return sum;
      }, 0);
      if (sumOfPreviousBids + bid === game.currentRound) {
        throw new Error("Last player cannot make a bid that would make the total equal to the number of cards in the round");
      }
    }
    player.currentBid = bid;
    game.turnCount++;
    logger.info(
      `Player ${player.name} placed bid: ${bid}, Turn: ${game.turnCount}`
    );

    if (game.turnCount === game.players.length) {
      game.status = "PLAYING";
      game.turnCount = 0;
      logger.info("222222222222222Bidding complete, moving to PLAYING phase");
      // Do NOT return here, let the API handler return the updated game state
    }

    this.moveToNextTurn(gameId);
  }

  playCard(gameId: string, playerId: string, card: any): void {
    logger.info("-----------------playCard()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");

    // Use GameValidator for card play validation
    if (!GameValidator.canPlayCard(game, player, card)) {
      throw new Error("Invalid card play");
    }

    const cardIndex = player.cards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value
    );
    if (cardIndex === -1) throw new Error("Card not found in player hand");
    player.cards.splice(cardIndex, 1);

    game.currentTrick = game.currentTrick || [];
    game.currentTrick.push({
      ...card,
      playedBy: playerId,
    });
    game.turnCount++;

    if (game.turnCount === game.players.length) {
      this.evaluateTrick(gameId);
      game.turnCount = 0;
    } else {
      this.moveToNextTurn(gameId);
    }
    if (this.isRoundComplete(game)) {
      this.completeRound(gameId)
    }
  }

  private getCardsForRound(currentRound: number, totalRounds: number): number {
    const MAX_CARDS = 13; // Maximum cards per player in any round
    
    // Calculate midpoint where cards should start decreasing
    const midpoint = Math.min(MAX_CARDS, Math.ceil(totalRounds / 2));
    
    if (currentRound <= midpoint) {
      // First half: ascending (1, 2, 3, ..., up to MAX_CARDS)
      return currentRound;
    } else if (currentRound <= totalRounds - midpoint + 1) {
      // Middle section (if totalRounds > 2*MAX_CARDS): stay at MAX_CARDS
      return MAX_CARDS;
    } else {
      // Final descending section
      const stepsFromEnd = totalRounds - currentRound + 1;
      return stepsFromEnd;
    }
  }
}
