import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService";
import { Card } from "../types";

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
      console.log("User connected");
      socket.on("hey", () => {
        console.log("Received hey event");
      });
      socket.on("createGame", (totalRounds: number) => {
        const game = this.gameService.createGame(totalRounds);
        console.log({ game });
        socket.emit("gameCreated", game);
      });

      socket.on('createSinglePlayerGame', (playerName: string) => {
        try {
          const game = this.gameService.createGameWithAI(5, playerName,socket.id);
          socket.join(game.id);
          socket.emit('gameCreated', game);
          
          // Start game immediately as we have all players
          this.gameService.startGame(game.id);
          this.io.to(game.id).emit('gameStarted', game);
        } catch (error) {
          console.error('Error creating single player game:', error);
          socket.emit('error', 'Failed to create game');
        }
      });
      
      socket.on('playCard', (gameId: string, card: Card) => {
        try {
          this.gameService.playCard(gameId, socket.id, card);
          // AI players take their turns
          this.gameService.playAITurns(gameId);
          // Emit updated game state
          const gameState = this.gameService.getGameState(gameId);
          this.io.to(gameId).emit('gameState', gameState);
        } catch (error) {
          socket.emit('error', 'Failed to play card');
        }
      });

      socket.on("joinGame", (gameId: string, playerName: string) => {
        try {
          // Add player using GameService
          const newPlayer = this.gameService.addPlayer(gameId, playerName, socket.id);
      
          // Join socket room
          socket.join(gameId);
      
          // Notify other players
          socket.to(gameId).emit("playerJoined", {
            playerId: newPlayer.id,
            playerName: newPlayer.name
          });
      
          // Send current game state
          const gameState = this.gameService.getGameState(gameId);
          console.log("222222222222222");
          
          console.log("Game State:", JSON.stringify(gameState, null, 2));
          socket.emit("gameState", gameState);
      
          // Check if game can start (4 players)
          const game = this.gameService.getGame(gameId);
          if (game?.players.length === 4) {
            this.io.to(gameId).emit("gameReadyToStart");
          }
      
        } catch (error) {
          console.error("Error in joinGame:", error);
          socket.emit("error", error instanceof Error ? error.message : "Failed to join game");
        }
      });

      socket.on('placeBid', (gameId: string, bid: number) => {
        try {
          this.gameService.placeBid(gameId, socket.id, bid);
          // AI players take their turns after human bid
          this.gameService.playAITurns(gameId);
          // Emit updated game state
          const gameState = this.gameService.getGameState(gameId);
          this.io.to(gameId).emit('gameState', gameState);
        } catch (error) {
          console.error('Error placing bid:', error);
          socket.emit('error', 'Failed to place bid');
        }
      });
      socket.on("disconnect", () => {
        console.log("User disconnected");
      });
    });
  }
}
