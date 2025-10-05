import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Table } from './index';
import { avatars } from './avatars';
import { apiService } from '../../services/api.service';
import WelcomeScreen from './WelcomeScreen';
import ComprehensiveTutorial from '../Tutorial/ComprehensiveTutorial';

// Move helper function outside component to prevent recreation on each render
const getCardLabel = (card) => {
  if (!card) return '';
  const valueMap = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  return (valueMap[card.value] || card.value) +
    (card.suit === 'HEARTS' ? '♥' : card.suit === 'DIAMONDS' ? '♦' : card.suit === 'CLUBS' ? '♣' : card.suit === 'SPADES' ? '♠' : '');
};

const RevampedGameContainer = () => {
  // Game setup and state
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [error, setError] = useState('');
  
  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  // Bidding state
  const [bidState, setBidState] = useState({
    amount: 0,
    error: '',
    animating: false
  });
  
  // Simple card play state - just track which card is being played
  const [pendingCard, setPendingCard] = useState(null);

  // Animation states for trick winner
  const [trickWinnerId, setTrickWinnerId] = useState(null);

  // Refs for tracking
  const winnerTimeoutRef = useRef(null);
  const cleanupTimeoutsRef = useRef([]);

  // Update ref when animation state changes
  useEffect(() => {
    console.log("👀 Monitoring turn change:", {
      currentTurn: gameState?.currentTurn,
      currentUserId,
      pendingCard: pendingCard ? `${pendingCard.value} of ${pendingCard.suit}` : null
    });
    
    // Clean up pending card when user's turn ends
    if (gameState?.currentTurn !== currentUserId) {
      if (pendingCard) {
        console.log("🧹 Clearing pending card - not user's turn");
      }
      setPendingCard(null);
    }
  }, [gameState?.currentTurn, currentUserId, pendingCard]);

  // Memoize the game state update function
  const updateGameState = useCallback((newState) => {
    console.log("🔄 Game state update received:", {
      previousTurn: gameState?.currentTurn,
      newTurn: newState?.currentTurn,
      previousStatus: gameState?.status,
      newStatus: newState?.status,
      previousTrickCount: gameState?.turnCount,
      newTrickCount: newState?.turnCount,
      currentTrick: newState?.currentTrick,
      newState: newState
    });
    
    // Clear pending card if no current trick or trick is empty
    if (!newState.currentTrick || newState.currentTrick.length === 0) {
      if (pendingCard) {
        console.log("🧹 Clearing pending card - new trick starting");
        setPendingCard(null);
      }
    }
    
    // Clear pending card if trick evaluation just finished
    if (gameState?.trickEvaluationInProgress && !newState.trickEvaluationInProgress) {
      if (pendingCard) {
        console.log("🧹 Clearing pending card - trick evaluation finished");
        setPendingCard(null);
      }
    }
    
    setGameState(prev => {
      // Only update if there are actual changes
      if (JSON.stringify(prev) === JSON.stringify(newState)) {
        console.log("⏭️ No changes in game state, skipping update");
        return prev;
      }
      console.log("✅ Game state updated");
      return newState;
    });
  }, [gameState, pendingCard]);

  // Helper to safely set timeouts with automatic cleanup
  const safeSetTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(callback, delay);
    cleanupTimeoutsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Clean up all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (winnerTimeoutRef.current) {
      clearTimeout(winnerTimeoutRef.current);
      winnerTimeoutRef.current = null;
    }
    cleanupTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    cleanupTimeoutsRef.current = [];
  }, []);

  // Memoize the trick complete handler
  const handleTrickComplete = useCallback((data) => {
    console.log("trick complete event....", data);
    
    setTrickWinnerId(data.winnerId);
    
    if (winnerTimeoutRef.current) {
      clearTimeout(winnerTimeoutRef.current);
    }
    
    winnerTimeoutRef.current = safeSetTimeout(() => {
      setTrickWinnerId(null);
    }, 1800);
  }, [safeSetTimeout]);

  // Simplified round complete handler
  const handleRoundComplete = useCallback(() => {
    console.log("Round complete event received");
    // Reset any pending states
    setPendingCard(null);
    setTrickWinnerId(null);
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    return () => {
      apiService.disconnect();
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  // Set up game state listener
  useEffect(() => {
    if (!gameState) return;

    if (playerName && !currentUserId) {
      const player = gameState.players.find(p => p.name === playerName);
      if (player) setCurrentUserId(player.id);
    }

    const unsubscribeGameState = apiService.onGameState(updateGameState);
    const unsubscribeTrickComplete = apiService.onTrickComplete(handleTrickComplete);
    const unsubscribeRoundComplete = apiService.onRoundComplete(handleRoundComplete);
    const unsubscribeGameFinished = apiService.onGameFinished((data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log("Game finished event received:", data);
        console.log("Current gameState players:", gameState?.players);
      }
      
      // Use the most current gameState to find the winner
      setGameState(currentGameState => {
        const winnerPlayer = currentGameState?.players?.find(p => p.id === data.winnerId);
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Found winner player:", winnerPlayer);
        }
        
        setGameEndState({
          finished: true,
          winner: winnerPlayer || { 
            id: data.winnerId, 
            name: data.winnerName || 'Unknown Player',
            score: 0 
          }
        });
        
        return currentGameState;
      });
    });
    const unsubscribeError = apiService.onError(setError);
    // console.log({unsubscribeError})

    return () => {
      unsubscribeGameState();
      unsubscribeTrickComplete();
      unsubscribeRoundComplete();
      unsubscribeGameFinished();
      unsubscribeError();
    };
  }, [gameState, playerName, currentUserId, updateGameState, handleTrickComplete, handleRoundComplete]);

  // Memoize the animation state debug log - simplified
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Game state changed:", {
        pendingCard: pendingCard,
        trickWinnerId: trickWinnerId,
        gameStatus: gameState?.status,
        currentTurn: gameState?.currentTurn,
        currentUserId: currentUserId
      });
    }
  }, [pendingCard, trickWinnerId, gameState?.status, gameState?.currentTurn, currentUserId]);

  // Round completion state
  const [gameEndState, setGameEndState] = useState({
    finished: false,
    winner: null
  });

  // Memoize players data to prevent unnecessary recalculations
  const mappedPlayers = useMemo(() => {
    if (!gameState) return [];
    
    return gameState.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      prevScore: p.prevScore,
      avatar: avatars[idx % avatars.length],
      cards: (p.cards || []).map(card => ({ ...card, label: getCardLabel(card) })),
      isCurrentTurn: gameState.currentTurn === p.id,
      tricks: p.tricks,
      currentBid: p.currentBid,
    }));
  }, [gameState]);

  // Memoize played cards data
  const playedCards = useMemo(() => {
    if (!gameState || !gameState.currentTrick) return [];
    
    return gameState.currentTrick.map(card => ({ 
      ...card, 
      label: getCardLabel(card) 
    }));
  }, [gameState]);

  // Memoize game info
  const gameInfo = useMemo(() => {
    if (!gameState) return { roundInfo: '', trumpSuit: null, gameStatus: '', isBidding: false, isCurrentUserTurn: false };
    
    const roundInfo = gameState.status === 'FINISHED' 
      ? 'Game Finished' 
      : `Round ${gameState.currentRound} / ${gameState.totalRounds}`;
    
    const gameStatus = gameState.status === 'FINISHED' 
      ? '' 
      : gameState.status === 'BIDDING' 
        ? 'Bidding Phase' 
        : gameState.status === 'PLAYING' 
          ? 'Playing Phase' 
          : 'Waiting';
    
    return {
      roundInfo,
      trumpSuit: gameState.trumpSuit,
      gameStatus,
      isBidding: gameState.status === 'BIDDING',
      isCurrentUserTurn: gameState.currentTurn === currentUserId
    };
  }, [gameState, currentUserId]);

  // Start game handler
  const startGame = useCallback(async (name, numberOfPlayers, numberOfRounds) => {
    if (!name) return;

    setPlayerName(name);
    
    try {
      const game = await apiService.createGame(name, numberOfPlayers, numberOfRounds);
      setGameState(game);
    } catch (err) {
      setError('Failed to create game');
    }
  }, []);

  // Bid validation
  const isValidBid = useCallback((bid) => {
    if (!gameState) return false;
    
    if (bid < 0 || bid > gameState.currentRound) {
      setBidState(prev => ({
        ...prev, 
        error: `Bid must be between 0 and ${gameState.currentRound}`
      }));
      return false;
    }
    
    const biddingPlayers = gameState.players.filter(
      p => p.id !== currentUserId && typeof p.currentBid === 'number' && p.currentBid >= 0
    );
    
    if (biddingPlayers.length === gameState.players.length - 1) {
      const sumOfPreviousBids = biddingPlayers.reduce(
        (sum, p) => sum + p.currentBid, 
        0
      );
      
      if (sumOfPreviousBids + bid === gameState.currentRound) {
        setBidState(prev => ({
          ...prev, 
          error: `Last bidder cannot make total bids equal to ${gameState.currentRound}`
        }));
        return false;
      }
    }
    
    setBidState(prev => ({ ...prev, error: '' }));
    return true;
  }, [gameState, currentUserId]);

  // Submit bid handler
  const handleSubmitBid = useCallback(async () => {
    if (!gameState) return;
    
    if (!isValidBid(bidState.amount)) {
      return;
    }
    
    try {
      setBidState(prev => ({ ...prev, animating: true }));
      
      await apiService.placeBid(gameState.id, bidState.amount);
      
      // The game state will be updated via WebSocket
      safeSetTimeout(() => {
        setBidState(prev => ({ ...prev, animating: false }));
      }, 500);
    } catch (err) {
      setBidState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to submit bid',
        animating: false
      }));
    }
  }, [gameState, bidState.amount, isValidBid, safeSetTimeout]);

  // Handle card play with simplified state management
  const handleCardPlay = useCallback(async (card) => {
    console.log("=== SIMPLIFIED CARD PLAY ===");
    console.log("Card:", card);
    console.log("Pending card:", pendingCard);
    console.log("Current turn:", gameState?.currentTurn);
    console.log("Current user:", currentUserId);
    console.log("Game status:", gameState?.status);
    console.log("Is bidding:", gameState?.status === 'BIDDING');
    console.log("Trick count:", gameState?.turnCount);
    console.log("Current trick:", gameState?.currentTrick);

    // Simple validation - only check basic conditions
    if (!gameState || 
        gameState.status !== 'PLAYING' ||
        gameState.currentTurn !== currentUserId ||
        pendingCard) {
      console.log("❌ Card play blocked");
      console.log("Blocked reason:", {
        noGameState: !gameState,
        statusNotPlaying: gameState?.status !== 'PLAYING',
        notPlayerTurn: gameState?.currentTurn !== currentUserId,
        hasPendingCard: !!pendingCard
      });
      return;
    }

    // Set this card as pending immediately
    setPendingCard(card);

    try {
      console.log("🚀 Playing card via API");
      await apiService.playCard(gameState.id, card);
      console.log("✅ Card played successfully");
      
      // Note: pendingCard will be cleared when game state updates or turn changes
    } catch (error) {
      console.log("555555555555")
      console.error("❌ Error playing card:", error);
      console.log("77777777777")
      // Reset pending card on error
      setPendingCard(null);
    }
  }, [gameState, currentUserId, pendingCard]);

  // Update bid amount handler
  const handleBidAmountChange = useCallback((amount) => {
    setBidState(prev => ({ ...prev, amount }));
  }, []);

  // Tutorial handlers
  const handleStartTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // New game handler
  const handleNewGame = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {showTutorial ? (
        <ComprehensiveTutorial onClose={handleCloseTutorial} />
      ) : !gameState ? (
        <WelcomeScreen onStartGame={startGame} onStartTutorial={handleStartTutorial} />
      ) : (
        <Table
          players={mappedPlayers}
          playedCards={playedCards}
          currentUserId={currentUserId}
          onCardClick={handleCardPlay}
          trickWinnerId={trickWinnerId}
          trumpSuit={gameInfo.trumpSuit}
          roundInfo={gameInfo.roundInfo}
          gameStatus={gameInfo.gameStatus}
          isBidding={gameInfo.isBidding}
          isCurrentUserTurn={gameInfo.isCurrentUserTurn}
          bidAmount={bidState.amount}
          setBidAmount={handleBidAmountChange}
          onSubmitBid={handleSubmitBid}
          bidError={bidState.error}
          animating={bidState.animating}
          gameFinished={gameEndState.finished}
          winner={gameEndState.winner}
          onNewGame={handleNewGame}
          pendingCard={pendingCard}
        />
      )}
    </div>
  );
};

// Enable why-did-you-render tracking for this component
RevampedGameContainer.whyDidYouRender = true;

export default RevampedGameContainer;
