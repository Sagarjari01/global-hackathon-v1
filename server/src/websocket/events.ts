// WebSocket Event Types

// Game related events
export enum GameEvents {
  JOIN_GAME = 'joinGame',
  GAME_STATE = 'gameState',
  PLAY_CARD = 'playCard',
  PLACE_BID = 'placeBid',
  TRICK_COMPLETE = 'trickComplete',
  ROUND_COMPLETE = 'roundComplete',
  GAME_FINISHED = 'gameFinished',
  ERROR = 'error'
}

// Data interfaces for events
export interface TrickCompleteData {
  winnerId: string;
  winnerName?: string;
  trickCards?: any[];
}

export interface RoundCompleteData {
  roundNumber: number;
  nextRound?: number;
  scores?: Record<string, number>;
}

export interface GameFinishedData {
  winnerId: string;
  winnerName: string;
  finalScores: Record<string, number>;
}
