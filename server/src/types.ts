export enum Suit {
    SPADES = 'SPADES',
    DIAMONDS = 'DIAMONDS',
    CLUBS = 'CLUBS',
    HEARTS = 'HEARTS'
  }
  
  export interface Card {
    suit: Suit;
    value: number;
  }
  
  export interface Player {
    id: string;
    name: string;
    cards: Card[];
    currentBid: number;
    score: number;
    isHost?: boolean;
    isAI?: boolean;
    tricks?: number;
  }
  
  export interface Game {
    id: string;
    players: Player[];
    currentRound: number;
    totalRounds: number;
    trumpSuit: Suit;
    cardsPerRound: number;
    currentTurn: string;
    status: 'WAITING' | 'BIDDING' | 'PLAYING' | 'FINISHED';
    currentTrick?: any[];
    currentSuit?: Suit;
    winner?: Player;
  }
