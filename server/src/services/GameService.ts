import { Game, Player, Suit } from "../types";
import logger from "../utils/logger";
import { AIPlayerService } from "./AIPlayerService";
import { CardService } from "./CardService";
import { GameValidator } from "../utils/validators";
import { EventEmitter } from 'events';

export class GameService {
  private games: Map<string, Game>;
  private cardService: CardService;
  private aiService: AIPlayerService;
  public events: EventEmitter;

  constructor() {
    this.games = new Map();
    this.cardService = new CardService();
    this.aiService = new AIPlayerService();
    this.events = new EventEmitter();
  }

  createGameWithAI(
    playerCount: number,
    playerName: string,
    roundCount: number = 6
  ): Game {
    logger.info("-----------------createGameWithAI()-----------------");
    // Ensure valid player counts (3-8 players total including human)
    if (playerCount < 3 || playerCount > 8) {
      throw new Error("Player count must be between 3 and 8");
    }

    const aiPlayerCount = playerCount - 1; // Subtract 1 for human player

    // Calculate min and max rounds based on player count
    const minRounds = 6;
    const maxRounds = Math.floor((52 / playerCount) * 2 - 1);

    // Validate round count is within appropriate range
    if (roundCount < minRounds) {
      logger.info(
        `Round count ${roundCount} is less than minimum ${minRounds}, setting to minimum`
      );
      roundCount = minRounds;
    } else if (roundCount > maxRounds) {
      logger.info(
        `Round count ${roundCount} exceeds maximum ${maxRounds} for ${playerCount} players, setting to maximum`
      );
      roundCount = maxRounds;
    }

    const game = this.createGame(roundCount);

    // Add human player with fixed ID
    this.addPlayer(game.id, playerName, "player-1");

    // Add AI players dynamically based on playerCount
    for (let i = 1; i <= aiPlayerCount; i++) {
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

    // Set flag to indicate trick evaluation is in progress
    game.trickEvaluationInProgress = true;

    const winningCard = this.findWinningCard(
      game.currentTrick,
      game.trumpSuit,
      game.currentTrick[0].suit
    );

    const winningPlayer = game.players.find(
      (p) => p.id === winningCard.playedBy
    );

    logger.info("Winning player: ");
    logger.info(JSON.stringify(winningPlayer));
    if (winningPlayer) {
      winningPlayer.tricks = (winningPlayer.tricks || 0) + 1;
      game.trickWinner = winningPlayer.id; // Set trick winner for animation
    }

    setTimeout(() => {
      game.currentTrick = [];
      game.currentSuit = undefined;
      
      // Reset flag after trick evaluation is complete
      game.trickEvaluationInProgress = false;
      logger.info("Trick evaluation complete, moving to next turn");
            // Only set currentTurn if round is NOT complete
      if (!this.isRoundComplete(game) && winningPlayer) {
        game.currentTurn = winningPlayer.id;
      }

      if (this.isRoundComplete(game)) {
        this.completeRound(gameId);
      }

      // Emit event that game state needs to be sent to clients and AI turns need to be rescheduled
      this.events.emit('gameStateUpdated', gameId);
    }, 2000); // 2 second delay
    logger.info(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
  }

  private isRoundComplete(game: Game): boolean {
    return game.players.every((p) => p.cards.length === 0);
  }

  private completeRound(gameId: string): void {
    logger.info("-----------------completeRound()-----------------");
    const game = this.getGame(gameId);
    if (!game) return;

    // Set round finished flag for animation
    game.roundFinished = true;

    // Store previous scores before updating
    game.players.forEach((player) => {
      player.prevScore = player.score;
    });

    // Score the round
    game.players.forEach((player) => {
      if (player.tricks === player.currentBid) {
        player.score += 10 + player.tricks;
      }
      player.tricks = 0;
      player.currentBid = -1;
    });

    game.currentRound++;

    if (game.currentRound > game.totalRounds) {
      // Game is finished - set appropriate state
      logger.info("Game completed! Setting status to FINISHED");
      game.status = "FINISHED";
      const winner = this.determineWinner(game);
      game.winner = winner;

      // Reset any in-progress game state for cleanliness
      game.currentTrick = [];
      game.currentSuit = undefined;
      game.turnCount = 0;

      // Log winner information
      logger.info(`Game winner: ${winner.name} with score ${winner.score}`);
      return;
    }

    // Set trickStartingPlayer to track who will start the next round
    const currentPlayerIndex = game.players.findIndex(
      (p) => p.id === game.currentTurn
    );
    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
    game.currentTurn = game.players[nextPlayerIndex].id;
    game.trickStartingPlayer = game.currentTurn;

    this.startRound(gameId);
  }

  private moveToNextTurn(gameId: string): void {
    logger.info("-----------------moveToNextTurn()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status === "FINISHED") return;
    if (game.players.length === 0) return;

    let currentIndex = game.players.findIndex((p) => p.id === game.currentTurn);
    if (currentIndex === -1) {
      game.currentTurn = game.players[0].id;
      currentIndex = 0;
    }

    // Find the next player with cards left
    let nextIndex = (currentIndex + 1) % game.players.length;
    let looped = false;
    while (game.players[nextIndex].cards.length === 0) {
      nextIndex = (nextIndex + 1) % game.players.length;
      if (nextIndex === currentIndex) {
        looped = true;
        break;
      }
    }
    if (!looped) {
      game.currentTurn = game.players[nextIndex].id;
      logger.info(`Turn moved from player ${currentIndex} to ${nextIndex}`);
    } else {
      logger.info("No players with cards left to move turn to.");
    }
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

    // Remove the limitation on 4 players
    // We now dynamically handle player counts from 3-8 in createGameWithAI

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
    game.trickWinner = undefined; // Clear trick winner when starting new round

    // Reset player round-specific fields
    game.players.forEach((player) => {
      player.tricks = 0;
      player.currentBid = -1;
    });

    game.trumpSuit = this.getTrumpSuitForRound(game.currentRound);

    this.cardService.shuffle();

    const cardsForThisRound = Math.min(
      game.currentRound,
      Math.floor(52 / game.players.length)
    );

    logger.info(
      `Round ${game.currentRound}/${game.totalRounds}: Dealing ${cardsForThisRound} cards per player`
    );

    logger.info("111111111111111111111")
    const hands = this.cardService.dealCards(
      game.players.length,
      cardsForThisRound
    );
    logger.info("2222222222222222222222222")

    game.players.forEach((player, index) => {
      player.cards = hands[index];
    });
    logger.info("333333333333333333")

    const openerIndex = (game.currentRound - 1) % game.players.length;
    game.currentTurn = game.players[openerIndex].id;
    logger.info("444444444444444444444")

    game.status = "BIDDING";
    logger.info("5555555555555555555")

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
        if (
          p.id !== playerId &&
          typeof p.currentBid === "number" &&
          p.currentBid >= 0
        ) {
          return sum + p.currentBid;
        }
        return sum;
      }, 0);
      if (sumOfPreviousBids + bid === game.currentRound) {
        throw new Error(
          "Last player cannot make a bid that would make the total equal to the number of cards in the round"
        );
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
      logger.info("Bidding complete, moving to PLAYING phase");
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

    if (game.currentTurn !== playerId) {
      throw new Error("Not your turn");
    }

    if (game.status !== "PLAYING") {
      throw new Error("Game is not in playing phase");
    }

    if (player.cards.length === 0) {
      throw new Error("No cards left to play");
    }

    // Use GameValidator for card play validation
    if (!GameValidator.canPlayCard(game, player, card)) {
      throw new Error("Invalid card play");
    }

    // Find matching card in player's hand
    const cardIndex = player.cards.findIndex(
      (c) => c.suit === card.suit && c.value === card.value
    );
    if (cardIndex === -1) throw new Error("Card not found in player hand");

    // Add card to trick
    const trickCard = {
      ...player.cards[cardIndex],
      playedBy: playerId,
    };

    // Check if this is the first card in the trick
    if (!game.currentTrick || game.currentTrick.length === 0) {
      game.currentSuit = trickCard.suit;
      game.trickStartingPlayer = playerId; // Track who started this trick
    }

    // Remove from player's hand
    player.cards.splice(cardIndex, 1);

    logger.info(
      `Player ${player.name} played card: ${trickCard.value} of ${trickCard.suit}`
    );
    // Add to trick
    if (!game.currentTrick) {
      game.currentTrick = [];
    }
    game.currentTrick.push(trickCard);
    game.turnCount++;

    // Check if trick is complete
    if (game.turnCount === game.players.length) {
      this.evaluateTrick(gameId);
      logger.info("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
      game.turnCount = 0;
    } else {
      this.moveToNextTurn(gameId);
    }
  }

  playAISingleTurn(gameId: string, playerId: string): void {
    logger.info("-----------------playAISingleTurn()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const currentPlayer = game.players.find((p) => p.id === playerId);
    if (!currentPlayer || !currentPlayer.isAI) {
      throw new Error("Not an AI player's turn");
    }
    
    // Don't proceed if trick evaluation is in progress
    if (game.trickEvaluationInProgress) {
      logger.info(`Skipping AI turn for ${currentPlayer.name} - trick evaluation in progress`);
      return;
    }

    if (game.status === "PLAYING") {
      logger.info(`AI Player ${currentPlayer.name} is playing a card`);

      // AI selects card
      const card = this.aiService.selectCard(
        currentPlayer.cards,
        game.currentTrick || [],
        game.trumpSuit,
        game.currentSuit
      );

      logger.info(
        `AI Player ${currentPlayer.name} plays ${card.value} of ${card.suit}`
      );

      // Clear trick winner for a clean animation
      game.trickWinner = undefined;

      // Play the card
      this.playCard(gameId, currentPlayer.id, card);

      // Capture the winning player's ID for animation
      if (this.isTrickComplete(game)) {
        const trick = game.currentTrick || [];
        const winningCard = this.findWinningCard(
          trick,
          game.trumpSuit,
          trick[0]?.suit
        );

        if (winningCard) {
          game.trickWinner = winningCard.playedBy;
        }
      }
    }
  }

  placeAISingleBid(gameId: string, playerId: string): void {
    logger.info("-----------------placeAISingleBid()-----------------");
    const game = this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const currentPlayer = game.players.find((p) => p.id === playerId);
    if (!currentPlayer || !currentPlayer.isAI) {
      throw new Error("Not an AI player's turn");
    }

    // Don't proceed if trick evaluation is in progress
    if (game.trickEvaluationInProgress) {
      logger.info(`Skipping AI bid for ${currentPlayer.name} - trick evaluation in progress`);
      return;
    }

    if (game.status === "BIDDING") {
      // Gather previous bids in order
      const previousBids = game.players
        .slice(0, game.turnCount)
        .map((p) =>
          typeof p.currentBid === "number" && p.currentBid >= 0
            ? p.currentBid
            : 0
        );

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
        game.roundFinished = false;
        logger.info("Bidding complete, moving to PLAYING phase");
      }

      this.moveToNextTurn(gameId);
    }
  }

  private determineWinner(game: Game): Player {
    // Find player with highest score
    return game.players.reduce((prev, current) =>
      prev.score > current.score ? prev : current
    );
  }
}
