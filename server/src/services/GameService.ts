import { Game, Player, Suit } from '../types';
import { AIPlayerService } from './AIPlayerService';
import { CardService } from './CardService';

export class GameService {
  private games: Map<string, Game>;
  private cardService: CardService;
  private aiService: AIPlayerService;

  constructor() {
    this.games = new Map();
    this.cardService = new CardService();
    this.aiService = new AIPlayerService();
  }


  createGameWithAI(totalRounds: number, playerName: string, socketId: string): Game {
    console.log("createGameWithAI")
    const game = this.createGame(totalRounds);
    
    // Add human player
    this.addPlayer(game.id, playerName, socketId);
    
    // Add AI players
    for (let i = 1; i <= 3; i++) {
      this.addAIPlayer(game.id, `AI Player ${i}`);
    }

    return game;
  }

  private addAIPlayer(gameId: string, name: string): Player {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const aiPlayer: Player = {
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      name,
      cards: [],
      score: 0,
      isAI: true,
      currentBid: 0
    };

    game.players.push(aiPlayer);
    return aiPlayer;
  }

  startGame(gameId: string): void {
    console.log("startGame")
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');
    
    game.status = 'BIDDING';
    game.currentTurn = game.players[0].id;
    this.startRound(gameId);
  }

  playAITurns(gameId: string) {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');

    while (true) {
      const currentPlayer = game.players.find(p => p.id === game.currentTurn);
      if (!currentPlayer?.isAI) break;

      try {
        if (game.status === 'BIDDING') {
          const bid = this.aiService.calculateBid(
            currentPlayer.cards,
            game.trumpSuit
          );
          this.placeBid(gameId, currentPlayer.id, bid);
          this.moveToNextTurn(gameId);
          
          // Check if bidding is complete
          if (this.isBiddingComplete(game)) {
            game.status = 'PLAYING';
          }
        } else if (game.status === 'PLAYING') {
          const card = this.aiService.selectCard(
            currentPlayer.cards,
            game.currentTrick || [],
            game.trumpSuit,
            game.currentSuit
          );
          this.playCard(gameId, currentPlayer.id, card);
          
          // Check if trick is complete
          if (this.isTrickComplete(game)) {
            this.evaluateTrick(gameId);
          } else {
            this.moveToNextTurn(gameId);
          }
        }
      } catch (error) {
        console.error(`AI Player ${currentPlayer.name} error:`, error);
        break;
      }
    }
  }

  private findWinningCard(trick: any[], trumpSuit: Suit, leadSuit: Suit | undefined): any {
    return trick[0]; // Simplified - implement proper card comparison logic
  }

  private evaluateTrick(gameId: string): void {
    const game = this.getGame(gameId);
    if (!game || !game.currentTrick) return;

    const winningCard = this.findWinningCard(game.currentTrick, game.trumpSuit, game.currentSuit);
    
    const winningPlayer = game.players.find(p => 
      p.cards.some(c => c === winningCard)
    );

    if (winningPlayer) {
      winningPlayer.tricks = (winningPlayer.tricks || 0) + 1;
      game.currentTurn = winningPlayer.id;
    }

    game.currentTrick = [];
    game.currentSuit = undefined;

    if (this.isRoundComplete(game)) {
      this.completeRound(gameId);
    }
  }

  private isRoundComplete(game: Game): boolean {
    return game.players.every(p => p.cards.length === 0);
  }

  private completeRound(gameId: string): void {
    const game = this.getGame(gameId);
    if (!game) return;

    // Score the round
    game.players.forEach(player => {
      if (player.tricks === player.currentBid) {
        player.score += 10 + player.tricks;
      }
      player.tricks = 0;
      player.currentBid = 0;
    });

    if (game.currentRound < game.totalRounds) {
      game.currentRound++;
      game.status = 'BIDDING';
      this.startRound(gameId);
    } else {
      // Find winner
      const winner = game.players.reduce((prev, current) => 
        (prev.score > current.score) ? prev : current
      );
      
      game.winner = winner;
      game.status = 'FINISHED';
      
      // Reset for potential new game
      game.currentTrick = [];
      game.currentSuit = undefined;
      game.currentTurn = '';
    }
  }

  private moveToNextTurn(gameId: string): void {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const currentIndex = game.players.findIndex(p => p.id === game.currentTurn);
    const nextIndex = (currentIndex + 1) % game.players.length;
    game.currentTurn = game.players[nextIndex].id;
  }

  

  private isBiddingComplete(game: Game): boolean {
    return game.players.every(p => typeof p.currentBid === 'number');
  }

  private isTrickComplete(game: Game): boolean {
    return (game.currentTrick?.length || 0) === game.players.length;
  }


  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  addPlayer(gameId: string, playerName: string, socketId: string): Player {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.players.length >= 4) throw new Error('Game is full');
    if (game.players.some(p => p.name === playerName)) throw new Error('Player name taken');

    const newPlayer: Player = {
      id: socketId,
      name: playerName,
      cards: [],
      score: 0,
      currentBid: 0,
      isHost: game.players.length === 0
    };

    game.players.push(newPlayer);
    return newPlayer;
  }

  createGame(totalRounds: number): Game {
    const game: Game = {
      id: Math.random().toString(36).substr(2, 9),
      players: [],
      currentRound: 1,
      totalRounds,
      trumpSuit: Suit.SPADES,
      cardsPerRound: 1,
      currentTurn: '',
      status: 'WAITING'
    };
    
    this.games.set(game.id, game);
    console.log("11111111111111")

    console.log(this.games);
    return game;
  }

  startRound(gameId: string): void {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');

    this.cardService.shuffle();
    const hands = this.cardService.dealCards(game.players.length, game.currentRound);
    
    game.players.forEach((player, index) => {
      player.cards = hands[index];
    });
    
    game.status = 'BIDDING';
  }

  getGameState(gameId: string) {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');

    return {
      gameId,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isHost: p.isHost,
        tricks: p.tricks || 0,
        currentBid: p.currentBid,
      })),
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      status: game.status,
      winner: game.winner,
      currentTurn: game.currentTurn
    };
  }

  placeBid(gameId: string, playerId: string, bid: number): void {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');
    
    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    player.currentBid = bid;
  }

  playCard(gameId: string, playerId: string, card: any): void {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');
    
    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const cardIndex = player.cards.findIndex(c => c === card);
    if (cardIndex === -1) throw new Error('Card not found in player hand');

    // Remove the card from player's hand
    player.cards.splice(cardIndex, 1);
    
    // Add the card to the current trick
    game.currentTrick = game.currentTrick || [];
    game.currentTrick.push(card);
  }
}