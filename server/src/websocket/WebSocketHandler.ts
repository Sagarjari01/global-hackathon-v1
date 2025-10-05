import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService";
import { Card } from "../types";
import logger from "../utils/logger";

export class WebSocketHandler {
  private io: Server;
  private gameService: GameService;

  constructor(io: Server) {
    this.io = io;
    this.gameService = new GameService();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      logger.info("-------------connection event-------------");
      socket.on("hey", () => {
        logger.info("Received hey event");
      });
      socket.on("createGame", (totalRounds: number) => {
        const game = this.gameService.createGame(totalRounds);
        logger.info({ game });
        socket.emit("gameCreated", game);
      });

      // socket.on('createSinglePlayerGame', (playerName: string) => {
      //   try {
      //     logger.info("-------------createSinglePlayerGame event----------------");
      //     const game = this.gameService.createGameWithAI(5, playerName,socket.id);
      //     socket.join(game.id);
      //     socket.emit('gameCreated', game);
          
      //     // Start game immediately as we have all players
      //     this.gameService.startGame(game.id);
      //     this.io.to(game.id).emit('gameStarted', game);
      //   } catch (error) {
      //     logger.error('Error creating single player game:', error);
      //     socket.emit('error', 'Failed to create game');
      //   }
      // });
      
      socket.on('playCard', (gameId: string, card: Card) => {
        try {
          logger.info("-------------playCard event----------------");
          this.gameService.playCard(gameId, socket.id, card);
          this.gameService.playAITurns(gameId);
          const gameState = this.gameService.getGameState(gameId);
          this.io.to(gameId).emit('gameState', gameState);
        } catch (error) {
          socket.emit('error', error instanceof Error ? error.message : 'Failed to play card');
        }
      });

      socket.on("joinGame", (gameId: string, playerName: string) => {
        try {
          logger.info("-------------joinGame event----------------");
          const newPlayer = this.gameService.addPlayer(gameId, playerName, socket.id);
      
          // Join socket room
          socket.join(gameId)
      
          // Notify other players
          socket.to(gameId).emit("playerJoined", {
            playerId: newPlayer.id,
            playerName: newPlayer.name
          });
      
          // Send current game state
          const gameState = this.gameService.getGameState(gameId);
          logger.info("222222222222222");
          
          logger.info("Game State:", JSON.stringify(gameState, null, 2));
          socket.emit("gameState", gameState);
      
          // Check if game can start (4 players)
          const game = this.gameService.getGame(gameId);
          if (game?.players.length === 4) {
            this.io.to(gameId).emit("gameReadyToStart");
          }
      
        } catch (error) {
          logger.error("Error in joinGame:", error);
          socket.emit("error", error instanceof Error ? error.message : "Failed to join game");
        }
      });

      socket.on('placeBid', (gameId: string, bid: number) => {
        try {
          logger.info("-------------Place Bid event----------------");
          this.gameService.placeBid(gameId, socket.id, bid);
          this.gameService.playAITurns(gameId);
          const gameState = this.gameService.getGameState(gameId);
          this.io.to(gameId).emit('gameState', gameState);
        } catch (error) {
          logger.error('Error placing bid:', error);
          socket.emit('error', error instanceof Error ? error.message : 'Failed to place bid');
        }
      });
      socket.on("disconnect", () => {
        logger.info("User disconnected");
      });
    });
  }
}
