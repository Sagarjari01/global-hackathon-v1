export const ENDPOINTS = {
    CREATE_GAME: '/api/game/create',
    PLACE_BID: (gameId) => `/api/game/${gameId}/bid`,
    PLAY_CARD: (gameId) => `/api/game/${gameId}/play`,
    AI_PLAY: (gameId) => `/api/game/${gameId}/ai-play`
  };

// WebSocket events - keep in sync with server events.ts
export const SOCKET_EVENTS = {
  JOIN_GAME: 'joinGame',
  GAME_STATE: 'gameState',
  PLAY_CARD: 'playCard',
  PLACE_BID: 'placeBid',
  TRICK_COMPLETE: 'trickComplete',
  ROUND_COMPLETE: 'roundComplete',
  GAME_FINISHED: 'gameFinished',
  ERROR: 'error'
};