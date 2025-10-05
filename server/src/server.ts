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

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());


// Game routes

app.get('/',(req,res)=>{
  res.send('Welcome to the Card Game API');
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/game/create', (req, res) => {
  try {
    const { playerName, playerCount = 3, roundCount = 6 } = req.body;
    const game = gameService.createGameWithAI(playerCount, playerName, roundCount);
    res.json(game);
  } catch (error) {
    logger.error('Error creating game:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create game' });
  }
});

// Initialize WebSocket handler
new WebSocketHandler(io, gameService);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});