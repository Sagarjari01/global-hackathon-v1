import config from '../config/config';
import { ENDPOINTS, SOCKET_EVENTS } from '../constants/endpoints';
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.gameStateListeners = new Set();
    this.trickCompleteListeners = new Set();
    this.roundCompleteListeners = new Set();
    this.gameFinishedListeners = new Set();
    this.errorListeners = new Set();
  }

  connect() {
    if (this.socket) return;
    
    this.socket = io(config.apiUrl);
    
    // Set up event listeners
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });
    
    this.socket.on(SOCKET_EVENTS.GAME_STATE, (gameState) => {
      this.gameStateListeners.forEach(listener => listener(gameState));
    });
    
    this.socket.on(SOCKET_EVENTS.TRICK_COMPLETE, (data) => {
      this.trickCompleteListeners.forEach(listener => listener(data));
    });
    
    this.socket.on(SOCKET_EVENTS.ROUND_COMPLETE, (data) => {
      this.roundCompleteListeners.forEach(listener => listener(data));
    });
    
    this.socket.on(SOCKET_EVENTS.GAME_FINISHED, (data) => {
      this.gameFinishedListeners.forEach(listener => listener(data));
    });
    
    this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('Socket error:', error);
      this.errorListeners.forEach(listener => listener(error));
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinGame(gameId) {
    if (!this.socket) this.connect();
    this.socket.emit(SOCKET_EVENTS.JOIN_GAME, gameId);
  }

  playCard(gameId, card) {
    console.log("playing card event....", card)
    if (!this.socket) this.connect();
    this.socket.emit(SOCKET_EVENTS.PLAY_CARD, gameId, card);
  }

  placeBid(gameId, bid) {
    if (!this.socket) this.connect();
    this.socket.emit(SOCKET_EVENTS.PLACE_BID, gameId, bid);
    // Return a promise that resolves when we get a game state update or rejects on error
    return new Promise((resolve, reject) => {
      const unsubscribeGameState = socketService.onGameState((gameState) => {
        unsubscribeGameState();
        unsubscribeError(); // Also unsubscribe from error on success
        resolve(gameState);
      });
      const unsubscribeError = socketService.onError((error) => {
        unsubscribeGameState(); // Unsubscribe from game state on error
        unsubscribeError();
        reject(new Error(error));
      });
    });
  }

  onGameState(callback) {
    this.gameStateListeners.add(callback);
    return () => this.gameStateListeners.delete(callback);
  }

  onTrickComplete(callback) {
    this.trickCompleteListeners.add(callback);
    return () => this.trickCompleteListeners.delete(callback);
  }

  onRoundComplete(callback) {
    this.roundCompleteListeners.add(callback);
    return () => this.roundCompleteListeners.delete(callback);
  }
  
  onGameFinished(callback) {
    this.gameFinishedListeners.add(callback);
    return () => this.gameFinishedListeners.delete(callback);
  }

  onError(callback) {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }
}

// Create a singleton instance
const socketService = new SocketService();

export const apiService = {
  // REST API calls
  createGame: async (playerName, playerCount = 3, roundCount = 6) => {
    const response = await fetch(`${config.apiUrl}${ENDPOINTS.CREATE_GAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        playerName,
        playerCount,
        roundCount
      })
    });
    const game = await response.json();
    
    // Connect to WebSocket and join the game room
    socketService.connect();
    socketService.joinGame(game.id);
    
    return game;
  },

  // WebSocket API
  placeBid: (gameId, bid) => {
    socketService.placeBid(gameId, bid);
    // Return a promise that resolves when we get a game state update
    return new Promise((resolve) => {
      const unsubscribe = socketService.onGameState((gameState) => {
        unsubscribe();
        resolve(gameState);
      });
    });
  },

  playCard: (gameId, card) => {
    socketService.playCard(gameId, card);
    // Return a promise that resolves when we get a game state update or rejects on error
    return new Promise((resolve, reject) => {
      const unsubscribeGameState = socketService.onGameState((gameState) => {
        unsubscribeGameState();
        unsubscribeError(); // Also unsubscribe from error on success
        resolve(gameState);
      });
      const unsubscribeError = socketService.onError((error) => {
        unsubscribeGameState(); // Unsubscribe from game state on error
        unsubscribeError();
        reject(new Error(error));
      });
    });
  },
  
  // No longer needed as we use WebSockets for real-time updates
  // aiPlay: async (gameId) => { ... }
  
  // Add socket event listeners
  onGameState: socketService.onGameState.bind(socketService),
  onTrickComplete: socketService.onTrickComplete.bind(socketService),
  onRoundComplete: socketService.onRoundComplete.bind(socketService),
  onGameFinished: socketService.onGameFinished.bind(socketService),
  onError: socketService.onError.bind(socketService),

  // Clean up
  disconnect: () => {
    socketService.disconnect();
  }
};