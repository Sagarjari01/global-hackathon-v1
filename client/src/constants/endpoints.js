export const ENDPOINTS = {
    CREATE_GAME: '/api/game/create',
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