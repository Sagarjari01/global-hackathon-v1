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

// Debounce function to prevent multiple rapid state updates
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
  
  // Animation states consolidated
  const [animationState, setAnimationState] = useState({
    isAnimating: false,
    canPlayCard: true,
    activeCardAnimation: null,
    trickWinnerId: null
  });

  // Refs for tracking state
  const animationStateRef = useRef(animationState);
  const roundCompleteTimeoutRef = useRef(null);
  const winnerTimeoutRef = useRef(null);
  const previousRoundRef = useRef(null);
  const cleanupTimeoutsRef = useRef([]);
  const isTransitioningRef = useRef(false);

  // Add a ref to track if a card is currently being played
  const isCardPlayInProgressRef = useRef(false);
  const lastPlayedCardRef = useRef(null);

  // Update ref when animation state changes
  useEffect(() => {
    animationStateRef.current = animationState;
  }, [animationState]);

  // Memoize the animation state update function with debouncing
  const updateAnimationState = useCallback((updates) => {
    const debouncedUpdate = debounce((updates) => {
      setAnimationState(prev => {
        // Only update if there are actual changes
        const hasChanges = Object.keys(updates).some(
          key => prev[key] !== updates[key]
        );
        return hasChanges ? { ...prev, ...updates } : prev;
      });
    }, 100);
    debouncedUpdate(updates);
  }, []);

  // Memoize the game state update function
  const updateGameState = useCallback((newState) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("updateGameState called with:", {
        newCurrentTrick: newState?.currentTrick,
        newCurrentTrickLength: newState?.currentTrick?.length,
        newCurrentTurn: newState?.currentTurn,
        newStatus: newState?.status
      });
    }
    
    setGameState(prev => {
      // Only update if there are actual changes
      if (JSON.stringify(prev) === JSON.stringify(newState)) {
        if (process.env.NODE_ENV === 'development') {
          console.log("No changes detected, keeping previous state");
        }
        return prev;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Updating game state - previous vs new:", {
          prevCurrentTrick: prev?.currentTrick?.length,
          newCurrentTrick: newState?.currentTrick?.length,
          prevCurrentTurn: prev?.currentTurn,
          newCurrentTurn: newState?.currentTurn
        });
      }
      
      // Replace the entire state instead of merging to ensure proper sync
      return newState;
    });
  }, []);

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
    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }
    cleanupTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    cleanupTimeoutsRef.current = [];
  }, []);

  // Reset animation state with proper timing
  const resetAnimationState = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Resetting animation state");
    }
    
    // Clear any existing timeouts
    clearAllTimeouts();
    
    // Reset the transitioning flag and card play lock
    isTransitioningRef.current = false;
    isCardPlayInProgressRef.current = false;
    lastPlayedCardRef.current = null;
    
    // Update animation state
    updateAnimationState({
      isAnimating: false,
      canPlayCard: true,
      activeCardAnimation: null,
      trickWinnerId: null
    });
  }, [updateAnimationState, clearAllTimeouts]);

  // Memoize the trick complete handler
  const handleTrickComplete = useCallback((data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("trick complete event....", data);
    }
    
    // Set transitioning flag to prevent any card plays during trick completion
    isTransitioningRef.current = true;
    // Reset card play lock when trick completes
    isCardPlayInProgressRef.current = false;
    
    updateAnimationState({ 
      trickWinnerId: data.winnerId,
      isAnimating: true,
      canPlayCard: false
    });
    
    if (winnerTimeoutRef.current) {
      clearTimeout(winnerTimeoutRef.current);
    }
    
    winnerTimeoutRef.current = safeSetTimeout(() => {
      resetAnimationState();
    }, 1800);
  }, [updateAnimationState, safeSetTimeout, resetAnimationState]);

  // Memoize the round complete handler with debouncing
  const handleRoundComplete = useCallback(() => {
    const debouncedHandler = debounce(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log("Round complete event received, resetting animation state");
      }

      // Clear any existing timeouts
      if (roundCompleteTimeoutRef.current) {
        clearTimeout(roundCompleteTimeoutRef.current);
      }

      // Set a new timeout to batch the state updates
      roundCompleteTimeoutRef.current = safeSetTimeout(() => {
        resetAnimationState();
      }, 100);
    }, 300);
    debouncedHandler();
  }, [resetAnimationState, safeSetTimeout]);

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

    return () => {
      unsubscribeGameState();
      unsubscribeTrickComplete();
      unsubscribeRoundComplete();
      unsubscribeGameFinished();
      unsubscribeError();
    };
  }, [gameState, playerName, currentUserId, updateGameState, handleTrickComplete, handleRoundComplete]);

  // Memoize the animation state debug log
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("animationState changed<***********>", {
        isAnimating: animationState.isAnimating,
        canPlayCard: animationState.canPlayCard,
        activeCardAnimation: animationState.activeCardAnimation,
        trickWinnerId: animationState.trickWinnerId,
        gameStatus: gameState?.status,
        currentTurn: gameState?.currentTurn,
        currentUserId: currentUserId
      });
    }
  }, [animationState, gameState?.status, gameState?.currentTurn, currentUserId]);

  // Round completion state
  const [roundState, setRoundState] = useState({
    showWinner: false,
    winnerData: null
  });
  
  // Game completion state
  const [gameEndState, setGameEndState] = useState({
    finished: false,
    winner: null
  });
  
  // Reset card animation when round changes
  useEffect(() => {
    if (!gameState) return;
    
    const currentRound = gameState.currentRound;
    
    if (previousRoundRef.current !== null && currentRound !== previousRoundRef.current) {
      // Reset animation state when round changes
      isCardPlayInProgressRef.current = false;
      lastPlayedCardRef.current = null;
      setAnimationState({
        isAnimating: false,
        canPlayCard: true,
        activeCardAnimation: null,
        trickWinnerId: null
      });
    }
    
    previousRoundRef.current = currentRound;
  }, [gameState?.currentRound, gameState]);

  // Reset locks when it's no longer the current user's turn
  useEffect(() => {
    if (!gameState) return;
    
    // Reset locks when turn changes away from current user
    if (gameState.currentTurn !== currentUserId && isCardPlayInProgressRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Resetting card play lock - no longer current user's turn");
      }
      isCardPlayInProgressRef.current = false;
      lastPlayedCardRef.current = null;
      // Don't reset animation state here if we're in a transition period
      if (!isTransitioningRef.current) {
        updateAnimationState({
          isAnimating: false,
          canPlayCard: true,
          activeCardAnimation: null
        });
      }
    }
  }, [gameState?.currentTurn, currentUserId, gameState, updateAnimationState]);

  // Track current trick to detect successful card plays
  const currentTrickLengthRef = useRef(0);
  
  // Reset locks when current trick changes (indicating successful card play)
  useEffect(() => {
    if (!gameState?.currentTrick) {
      currentTrickLengthRef.current = 0;
      return;
    }
    
    const newTrickLength = gameState.currentTrick.length;
    const previousTrickLength = currentTrickLengthRef.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log("Trick length change detected:", {
        previousLength: previousTrickLength,
        newLength: newTrickLength,
        isCardPlayInProgress: isCardPlayInProgressRef.current,
        isTransitioning: isTransitioningRef.current
      });
    }
    
    // Only reset locks when a NEW trick starts (length goes to 0), not when trick completes
    if (newTrickLength === 0 && previousTrickLength > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log("New trick started - resetting all locks");
      }
      isCardPlayInProgressRef.current = false;
      lastPlayedCardRef.current = null;
      isTransitioningRef.current = false; // Also reset transitioning flag
      updateAnimationState({
        isAnimating: false,
        canPlayCard: true,
        activeCardAnimation: null,
        trickWinnerId: null
      });
    }
    // If trick is complete (4 cards), reset card play lock but keep animation locked for trick completion animation
    else if (newTrickLength === 4 && previousTrickLength < 4) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Trick complete (4 cards) - resetting card play lock but keeping animation locked");
      }
      isCardPlayInProgressRef.current = false;
      // Keep animation state as is - will be handled by trick complete event
    }
    // If trick length increased but we're still in the same trick, keep locks engaged
    else if (newTrickLength > previousTrickLength && isCardPlayInProgressRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Card successfully played but trick not complete - keeping ALL locks until trick finishes", {
          previousLength: previousTrickLength,
          newLength: newTrickLength
        });
      }
      
      // Keep BOTH the card play lock AND animation state locked until trick completes
      // This prevents rapid clicking of multiple cards
      // isCardPlayInProgressRef.current = false; // DON'T reset this yet!
      // Do NOT reset animation state here - wait for trick to complete
    }
    
    currentTrickLengthRef.current = newTrickLength;
  }, [gameState?.currentTrick, updateAnimationState]);

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

  // Handle card play with improved state management
  const handleCardPlay = useCallback(async (card) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("card play called with card:", card);
      console.log("Current game state:", {
        gameState,
        ...animationStateRef.current,
        currentTurn: gameState?.currentTurn,
        currentUserId,
        isCardPlayInProgress: isCardPlayInProgressRef.current,
        lastPlayedCard: lastPlayedCardRef.current,
        currentTrickLength: gameState?.currentTrick?.length || 0
      });
    }

    // Immediate atomic check and lock to prevent race conditions
    if (isCardPlayInProgressRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Card play blocked - already in progress");
      }
      return;
    }

    // Check if current user has already played in this trick
    if (gameState?.currentTrick?.some(playedCard => playedCard.playerId === currentUserId)) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Card play blocked - user already played in this trick");
      }
      return;
    }

    // Set card play lock immediately to prevent race conditions
    isCardPlayInProgressRef.current = true;

    // Check if we can play a card (after setting the lock)
    // FIXED: Remove the trick length check or handle empty arrays properly
    const canPlay = !isTransitioningRef.current && 
                   gameState && 
                   !animationStateRef.current.isAnimating && 
                   animationStateRef.current.canPlayCard &&
                   gameState.currentTurn === currentUserId &&
                   gameState.status === 'PLAYING' &&
                   (!gameState.currentTrick || gameState.currentTrick.length < 4); // Allow play if trick is not complete OR not initialized

    if (!canPlay) {
      // Reset the lock if we can't play
      isCardPlayInProgressRef.current = false;
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Card play blocked because:", {
          noGameState: !gameState,
          isAnimating: animationStateRef.current.isAnimating,
          cannotPlayCard: !animationStateRef.current.canPlayCard,
          isTransitioning: isTransitioningRef.current,
          notCurrentTurn: gameState?.currentTurn !== currentUserId,
          notPlayingStatus: gameState?.status !== 'PLAYING',
          trickComplete: gameState?.currentTrick?.length >= 4,
          currentTrickLength: gameState?.currentTrick?.length,
          currentTurn: gameState?.currentTurn,
          currentUserId: currentUserId,
          gameStateCurrentTrick: gameState?.currentTrick,
          canPlayCalculation: (!gameState.currentTrick || gameState.currentTrick.length < 4) // Updated to match the new condition
        });
      }
      return;
    }

    // Additional check to prevent playing the same card twice
    if (lastPlayedCardRef.current && 
        lastPlayedCardRef.current.suit === card.suit && 
        lastPlayedCardRef.current.value === card.value) {
      isCardPlayInProgressRef.current = false;
      if (process.env.NODE_ENV === 'development') {
        console.log("Card play blocked - same card already played");
      }
      return;
    }

    lastPlayedCardRef.current = card;

    // Set animation state before playing card
    updateAnimationState({
      isAnimating: true,
      canPlayCard: false,
      activeCardAnimation: card
    });

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log("Attempting to play card via API");
      }
      
      await apiService.playCard(gameState.id, card);
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Card played successfully");
      }
      
      // The locks will be reset when the game state updates with the new trick
    } catch (error) {
      console.error("Error playing card:", error);
      // Reset animation state and lock on error
      isCardPlayInProgressRef.current = false;
      lastPlayedCardRef.current = null;
      updateAnimationState({
        isAnimating: false,
        canPlayCard: true,
        activeCardAnimation: null
      });
    }
  }, [gameState, currentUserId, updateAnimationState]);

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
          trickWinnerId={animationState.trickWinnerId}
          trumpSuit={gameInfo.trumpSuit}
          roundInfo={gameInfo.roundInfo}
          gameStatus={gameInfo.gameStatus}
          isBidding={gameInfo.isBidding}
          isCurrentUserTurn={gameInfo.isCurrentUserTurn}
          bidAmount={bidState.amount}
          setBidAmount={handleBidAmountChange}
          onSubmitBid={handleSubmitBid}
          bidError={bidState.error}
          animating={bidState.animating || animationState.isAnimating}
          gameFinished={gameEndState.finished}
          winner={gameEndState.winner}
          onNewGame={handleNewGame}
          activeCardAnimation={animationState.activeCardAnimation}
          showRoundWinner={roundState.showWinner}
          roundWinnerData={roundState.winnerData}
        />
      )}
    </div>
  );
};

// Enable why-did-you-render tracking for this component
RevampedGameContainer.whyDidYouRender = true;

export default RevampedGameContainer;
