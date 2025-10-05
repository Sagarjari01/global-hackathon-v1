import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService";
import { Card, Game } from "../types";
import logger from "../utils/logger";
import { GameEvents, TrickCompleteData, RoundCompleteData, GameFinishedData } from "./events";
import { log } from "console";

export class WebSocketHandler {
  private io: Server;
  private gameService: GameService;
  private aiTurnTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server, gameService: GameService) {
    this.io = io;
    this.gameService = gameService;
    this.setupEventHandlers();
    
    // Listen for game state updates that require client notification
    this.gameService.events.on('gameStateUpdated', (gameId: string) => {
      try {
        logger.info(`Game state updated for game ${gameId}`);
        const gameState = this.gameService.getGameState(gameId);
        this.io.to(gameId).emit(GameEvents.GAME_STATE, gameState);
        
        // Also send round complete event if needed
        if (gameState.roundFinished) {
          this.io.to(gameId).emit(GameEvents.ROUND_COMPLETE, {
            roundNumber: gameState.currentRound - 1
          });
        }
        
        // Check if game is finished and emit GAME_FINISHED event
        if (gameState.status === "FINISHED" && gameState.winner) {
          const gameFinishedData: GameFinishedData = {
            winnerId: gameState.winner.id,
            winnerName: gameState.winner.name,
            finalScores: gameState.players.reduce<Record<string, number>>((scores, player) => {
              scores[player.id] = player.score;
              return scores;
            }, {})
          };
          
          logger.info("🎉 EMITTING GAME_FINISHED EVENT (from gameStateUpdated):", gameFinishedData);
          this.io.to(gameId).emit(GameEvents.GAME_FINISHED, gameFinishedData);
          return; // Don't schedule more turns when game is finished
        }
        
        // Schedule next AI turn if it's an AI's turn
        this.scheduleNextAITurn(gameId);
      } catch (error) {
        logger.error(`Error processing gameStateUpdated event: ${error}`);
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join a specific game room
      socket.on(GameEvents.JOIN_GAME, (gameId: string) => {
        logger.info(`Client ${socket.id} joining game room: ${gameId}`);
        socket.join(gameId);
        
        // Send current game state to the newly connected client
        try {
          const gameState = this.gameService.getGameState(gameId);
          socket.emit(GameEvents.GAME_STATE, gameState);
        } catch (error) {
          logger.error(`Error getting game state for ${gameId}:`, error);
          socket.emit(GameEvents.ERROR, "Failed to get game state");
        }
      });

      // Handle playing a card
      socket.on(GameEvents.PLAY_CARD, (gameId: string, card: Card) => {
        try {
          logger.info(`Received playCard event for game ${gameId}`);
          
          // Play the human player's card
          this.gameService.playCard(gameId, 'player-1', card);
          
          // Send updated game state to all clients in the game room
          const gameState = this.gameService.getGameState(gameId);
          this.io.to(gameId).emit(GameEvents.GAME_STATE, gameState);
          
          // Schedule AI turns after a short delay
          logger.info("333333333333333333333")
          logger.info("333333333333333333333")
          this.scheduleNextAITurn(gameId);
        } catch (error) {
          logger.error('Error playing card:', error);
          socket.emit(GameEvents.ERROR, error instanceof Error ? error.message : 'Failed to play card');
        }
      });

      // Handle placing a bid
      socket.on(GameEvents.PLACE_BID, (gameId: string, bid: number) => {
        try {
          logger.info(`Received placeBid event for game ${gameId}: ${bid}`);
          
          // Place the human player's bid
          this.gameService.placeBid(gameId, 'player-1', bid);
          
          // Send updated game state to all clients in the game room
          const gameState = this.gameService.getGameState(gameId);
          this.io.to(gameId).emit(GameEvents.GAME_STATE, gameState);
          
          // Schedule AI turns after a short delay
          this.scheduleNextAITurn(gameId);
        } catch (error) {
          logger.error('Error placing bid:', error);
          socket.emit(GameEvents.ERROR, error instanceof Error ? error.message : 'Failed to place bid');
        }
      });

      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Process AI turns one by one with delays between actions
  private scheduleNextAITurn(gameId: string): void {
    try {
      // Clear any existing timer for this game
      logger.info(`Scheduling next AI turn for game ${gameId}`);
      logger.info('AAAAAAAAAAAAAAAAAAAaaa')
      if (this.aiTurnTimers.has(gameId)) {
        clearTimeout(this.aiTurnTimers.get(gameId));
      }
      logger.info('BBBBBBBBBBBBBBBBBBBbbb')

      const game = this.gameService.getGame(gameId);
      if (!game || game.status === "FINISHED") {
        return;
      }
      logger.info('CCCCCCCCCCCCCCCCCCCccc')

      // Check if it's an AI player's turn
      const isAITurn = this.isAIPlayerTurn(game);
      logger.info({isAITurn})
      if (!isAITurn) {
        return;
      }

      logger.info('DDDDDDDDDDDDDDDDDDDddd')
      // Set a delay before the AI takes its turn (for better UX)
      this.aiTurnTimers.set(
        gameId,
        setTimeout(() => {
          logger.info('EEEEEEEEEEEEEEEEEEEeee')
          this.processAITurn(gameId);
        }, 1000) // 1 second delay
      );
    } catch (error) {
      logger.error(`Error in scheduleNextAITurn for game ${gameId}:`, error);
    }
  }

  // Process a single AI turn
  private processAITurn(gameId: string): void {
    try {
      logger.info(`Processing AI turn for game ${gameId}`);
      const game = this.gameService.getGame(gameId);
      if (!game || game.status === "FINISHED") {
        return;
      }

      const currentPlayerIndex = game.players.findIndex(p => p.id === game.currentTurn);
      if (currentPlayerIndex === -1) {
        return;
      }
      
      const currentPlayer = game.players[currentPlayerIndex];
      if (!currentPlayer.isAI) {
        return;
      }

      // Handle AI bid or card play based on game status
      if (game.status === "BIDDING") {
        this.gameService.placeAISingleBid(gameId, currentPlayer.id);
      } else if (game.status === "PLAYING") {
        this.gameService.playAISingleTurn(gameId, currentPlayer.id);
      }

      // Send updated game state to all clients
      const updatedGame = this.gameService.getGameState(gameId);
      this.io.to(gameId).emit(GameEvents.GAME_STATE, updatedGame);
      
      // Add special event for trick winner animation
      if (updatedGame.trickWinner) {
        const trickData: TrickCompleteData = {
          winnerId: updatedGame.trickWinner
        };

        console.log("&&&&&&&&&&&&&&&")
        console.log("trickData--->", trickData)
        
        this.io.to(gameId).emit(GameEvents.TRICK_COMPLETE, trickData);
      }
      
      // Add special event for round completion
      if (updatedGame.roundFinished) {
        const roundData: RoundCompleteData = {
          roundNumber: updatedGame.currentRound - 1
        };
        
        this.io.to(gameId).emit(GameEvents.ROUND_COMPLETE, roundData);
      }
      
      // Check if game is finished
      if (updatedGame.status === "FINISHED" && updatedGame.winner) {
        const gameFinishedData: GameFinishedData = {
          winnerId: updatedGame.winner.id,
          winnerName: updatedGame.winner.name,
          finalScores: updatedGame.players.reduce<Record<string, number>>((scores, player) => {
            scores[player.id] = player.score;
            return scores;
          }, {})
        };
        
        logger.info("🎉 EMITTING GAME_FINISHED EVENT:", gameFinishedData);
        this.io.to(gameId).emit(GameEvents.GAME_FINISHED, gameFinishedData);
        return; // Don't schedule more turns
      }

      // Schedule the next AI turn if it's still an AI's turn
      this.scheduleNextAITurn(gameId);
    } catch (error) {
      logger.error(`Error in processAITurn for game ${gameId}:`, error);
    }
  }

  // Helper to check if it's an AI player's turn
  private isAIPlayerTurn(game: Game): boolean {
    logger.info(`Checking if it's AI player's turn for game`);
    logger.info('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
    if (!game || game.status === "FINISHED") {
      return false;
    }
    logger.info('****************************')

    // Don't proceed if trick evaluation is in progress
    if (game.trickEvaluationInProgress) {
      logger.info('Trick evaluation in progress, will reschedule later');
      return false;
    }

    logger.info('++++++++++++++++++++++++++++')
    const currentPlayer = game.players.find(p => p.id === game.currentTurn);
    logger.info(')))))))))))))))))))))))))))))))))')
    return currentPlayer?.isAI === true;
  }
}
