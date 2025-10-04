export const ENDPOINTS = {
    CREATE_GAME: '/api/game/create',
    PLACE_BID: (gameId) => `/api/game/${gameId}/bid`,
    PLAY_CARD: (gameId) => `/api/game/${gameId}/play`
  };