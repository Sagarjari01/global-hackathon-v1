import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebSocketHandler } from './websocket/WebSocketHandler';
import { GameService } from './services/GameService';
import logger from './utils/logger';
const app = express();
const gameService = new GameService();
const httpServer = createServer(app);
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://localhost:3000", // Frontend URL
//     methods: ["GET", "POST"],
//   },
// });

app.use(cors());
app.use(express.json());


// Game routes
app.post('/api/game/create', (req, res) => {
  try {
    const { playerName } = req.body;
    // TODO: chane static number of rounds
    const game = gameService.createGameWithAI(5, playerName);
    // logger.info(JSON.stringify(game, null, 2));
    res.json(game);
  } catch (error) {
    logger.error('Error creating game:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create game' });
  }
});

app.post('/api/game/:gameId/play', (req, res) => {
  try {
    const { gameId } = req.params;
    const { card } = req.body;
    gameService.playCard(gameId, 'player-1', card);
    gameService.playAITurns(gameId);
    const gameState = gameService.getGameState(gameId);
    res.json(gameState);
  } catch (error) {
    logger.error('Error playing card:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to play card' });
  }
});

app.post('/api/game/:gameId/bid', (req, res) => {
  try {
    const { gameId } = req.params;
    const { bid } = req.body;
    gameService.placeBid(gameId, 'player-1', bid);
    gameService.playAITurns(gameId);
    const gameState = gameService.getGameState(gameId)
    res.json(gameState);
  } catch (error) {
    logger.error('Error placing bid:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to place bid' });
  }
});

// new WebSocketHandler(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});