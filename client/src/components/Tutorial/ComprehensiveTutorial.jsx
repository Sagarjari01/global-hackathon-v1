import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table } from '../RevampedGame';
import { avatars } from '../RevampedGame/avatars';
import TutorialOverlay from './TutorialOverlay';
import styles from './Tutorial.module.css';

// Comprehensive tutorial steps covering all game rules
const tutorialSteps = [
  {
    id: 1,
    title: "Welcome to Judgment Card Game! 🎴",
    content: "Judgment is a strategic trick-taking card game played with a standard 52-card deck. You'll predict exactly how many tricks you'll win each round. Let's learn how to play!",
    highlight: null,
    position: "center"
  },
  {
    id: 2,
    title: "Game Setup 🎯",
    content: "The game has multiple rounds. In Round 1, each player gets 1 card. In Round 2, each player gets 2 cards, and so on. The number of rounds depends on the number of players.",
    highlight: "gameHeader",
    position: "bottom"
  },
  {
    id: 3,
    title: "Trump Suits ♠♥♣♦",
    content: "Each round has a trump suit that changes in order: Round 1=Spades, Round 2=Diamonds, Round 3=Clubs, Round 4=Hearts, then repeats. Trump cards beat all other suits!",
    highlight: "trumpSuit",
    position: "left"
  },
  {
    id: 4,
    title: "Bidding Phase - Your Turn 🎯",
    content: "Bid how many tricks you think you'll win this round. In Round 1, you can bid 0 (no tricks) or 1 (win the trick). Click the + or - buttons to set your bid.",
    highlight: "biddingControls",
    position: "bottom",
    interactive: true,
    action: "bid"
  },
  {
    id: 5,
    title: "Bidding Rules - The Last Player 🚫",
    content: "The last player to bid has a restriction: their bid cannot make the total equal to the round number. Here Alice bid 1, Bob bid 0, so Charlie cannot bid 0 (total would equal 1).",
    highlight: "currentPlayer",
    position: "top"
  },
  {
    id: 6,
    title: "Bidding Complete ✅",
    content: "All players have made their bids. You bid 1, Alice bid 0, Bob bid 0, Charlie bid 1. Total bids = 2, which is allowed since it doesn't equal 1 (the round number).",
    highlight: "playerStats",
    position: "bottom"
  },
  {
    id: 7,
    title: "Playing Phase - Following Suit 🃏",
    content: "Now it's time to play cards! You must follow the suit of the first card played if you have that suit. Since you're first, you can play any card. Try playing your Ace of Spades!",
    highlight: "currentPlayerHand",
    position: "top",
    interactive: true,
    action: "playCard"
  },
  {
    id: 8,
    title: "Following Suit Rule 📏",
    content: "Alice played 5♠, Bob had no spades so played 2♥, Charlie played 3♠. When you can't follow suit, you can play any card, but only trump cards can win.",
    highlight: "centerArea",
    position: "center"
  },
  {
    id: 9,
    title: "Trick Winner - Highest Card Wins 🏆",
    content: "Your Ace of Spades is the highest spade played, so you win this trick! Bob's 2♥ doesn't count because it's not spades and Hearts isn't trump this round.",
    highlight: "centerArea",
    position: "center"
  },
  {
    id: 10,
    title: "Trump Suit Example - Round 2 ♥",
    content: "New round with Hearts as trump! Watch how trump cards work. Alice leads with A♣, Bob plays K♣, Charlie plays Q♣. Now you have a choice...",
    highlight: "trumpSuit",
    position: "left"
  },
  {
    id: 11,
    title: "Trump Power! ⚡",
    content: "Play your 2♥ (trump) and it will beat all the clubs! Even the smallest trump card beats the highest non-trump card. Trump suit is the most powerful!",
    highlight: "currentPlayerHand",
    position: "top",
    interactive: true,
    action: "playTrump"
  },
  {
    id: 12,
    title: "Card Rankings 📊",
    content: "Card values from highest to lowest: Ace > King > Queen > Jack > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2. But remember: ANY trump card beats ANY non-trump card!",
    highlight: null,
    position: "center"
  },
  {
    id: 13,
    title: "Scoring System 💯",
    content: "If you make EXACTLY your bid: get Bid + 10 points. If you don't make your bid: get 0 points. You bid 1 and won 1 trick = 11 points. Perfect prediction!",
    highlight: "playerStats",
    position: "bottom"
  },
  {
    id: 14,
    title: "Winning the Game 🎉",
    content: "After all rounds are complete, the player with the highest total score wins! Consistent accurate bidding is key to victory. Good luck!",
    highlight: null,
    position: "center"
  }
];

// Enhanced tutorial game states
const createTutorialGameState = (step) => {
  const baseState = {
    id: 'tutorial',
    players: [
      { id: '1', name: 'You', score: 0, cards: [], isCurrentTurn: false, currentBid: null, tricks: 0 },
      { id: '2', name: 'Alice', score: 0, cards: [], isCurrentTurn: false, currentBid: null, tricks: 0 },
      { id: '3', name: 'Bob', score: 0, cards: [], isCurrentTurn: false, currentBid: null, tricks: 0 },
      { id: '4', name: 'Charlie', score: 0, cards: [], isCurrentTurn: false, currentBid: null, tricks: 0 }
    ],
    currentRound: 1,
    totalRounds: 5,
    trumpSuit: 'SPADES',
    status: 'BIDDING',
    currentTurn: '1',
    currentTrick: []
  };

  switch (step) {
    case 1:
    case 2:
    case 3:
      return {
        ...baseState,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx]
        }))
      };
    
    case 4: // Your bidding turn
      return {
        ...baseState,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          cards: idx === 0 ? [{ value: 14, suit: 'SPADES', label: 'A♠' }] : []
        })),
        currentTurn: '1'
      };
    
    case 5: // Last player bidding restriction
      return {
        ...baseState,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 0, null][idx],
          cards: idx === 0 ? [{ value: 14, suit: 'SPADES', label: 'A♠' }] : []
        })),
        currentTurn: '4'
      };
    
    case 6: // Bidding complete
      return {
        ...baseState,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 0, 1][idx],
          cards: idx === 0 ? [{ value: 14, suit: 'SPADES', label: 'A♠' }] : []
        })),
        status: 'PLAYING',
        currentTurn: '1'
      };
    
    case 7: // Playing first card
      return {
        ...baseState,
        status: 'PLAYING',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 0, 1][idx],
          cards: idx === 0 ? [{ value: 14, suit: 'SPADES', label: 'A♠' }] : []
        })),
        currentTurn: '1'
      };
    
    case 8:
    case 9: // After cards played
      return {
        ...baseState,
        status: 'PLAYING',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 0, 1][idx],
          cards: idx === 0 ? [] : []
        })),
        currentTrick: [
          { value: 14, suit: 'SPADES', label: 'A♠' }, // You
          { value: 5, suit: 'SPADES', label: '5♠' },  // Alice
          { value: 2, suit: 'HEARTS', label: '2♥' },  // Bob (no spades)
          { value: 3, suit: 'SPADES', label: '3♠' }   // Charlie
        ],
        currentTurn: '2'
      };
    
    case 10: // Round 2 - Trump example setup
      return {
        ...baseState,
        status: 'PLAYING',
        currentRound: 2,
        trumpSuit: 'HEARTS',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 1, 0][idx],
          cards: idx === 0 ? [
            { value: 2, suit: 'HEARTS', label: '2♥' },
            { value: 10, suit: 'CLUBS', label: '10♣' }
          ] : []
        })),
        currentTrick: [],
        currentTurn: '2'
      };
    
    case 11: // Trump card play
      return {
        ...baseState,
        status: 'PLAYING',
        currentRound: 2,
        trumpSuit: 'HEARTS',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 1, 0][idx],
          cards: idx === 0 ? [
            { value: 2, suit: 'HEARTS', label: '2♥' },
            { value: 10, suit: 'CLUBS', label: '10♣' }
          ] : []
        })),
        currentTrick: [
          { value: 14, suit: 'CLUBS', label: 'A♣' }, // Alice
          { value: 13, suit: 'CLUBS', label: 'K♣' }, // Bob
          { value: 12, suit: 'CLUBS', label: 'Q♣' }  // Charlie
        ],
        currentTurn: '1'
      };
    
    case 12:
      return {
        ...baseState,
        status: 'PLAYING',
        currentRound: 2,
        trumpSuit: 'HEARTS',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 1, 0][idx],
          cards: idx === 0 ? [{ value: 10, suit: 'CLUBS', label: '10♣' }] : []
        })),
        currentTrick: [
          { value: 14, suit: 'CLUBS', label: 'A♣' }, // Alice
          { value: 13, suit: 'CLUBS', label: 'K♣' }, // Bob
          { value: 12, suit: 'CLUBS', label: 'Q♣' }, // Charlie
          { value: 2, suit: 'HEARTS', label: '2♥' }   // You (trump wins!)
        ],
        currentTurn: '2'
      };
    
    case 13: // Scoring display
      return {
        ...baseState,
        status: 'FINISHED',
        currentRound: 2,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          score: [11, 10, 0, 11][idx], // You, Alice, Bob, Charlie
          currentBid: [1, 0, 1, 1][idx],
          tricks: [1, 0, 0, 1][idx]
        }))
      };
    
    case 14: // Final summary
      return {
        ...baseState,
        status: 'FINISHED',
        currentRound: 5,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          score: [67, 45, 23, 58][idx],
          currentBid: [3, 2, 1, 2][idx],
          tricks: [3, 2, 0, 2][idx]
        }))
      };
    
    default:
      return baseState;
  }
};

const TutorialContainer = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [gameState, setGameState] = useState(null);
  const [showOverlay] = useState(true); // Always show overlay during tutorial
  const [bidAmount, setBidAmount] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [completedInteractions, setCompletedInteractions] = useState(new Set());
  // eslint-disable-next-line no-unused-vars
  const [waitingForInteraction, setWaitingForInteraction] = useState(false);

  // Update game state when step changes
  useEffect(() => {
    setGameState(createTutorialGameState(currentStep));
  }, [currentStep]);

  // Memoize current tutorial step data
  const currentStepData = useMemo(() => {
    return tutorialSteps.find(step => step.id === currentStep);
  }, [currentStep]);

  // Memoize players data for Table component
  const mappedPlayers = useMemo(() => {
    if (!gameState) return [];
    
    return gameState.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      avatar: p.avatar,
      cards: p.cards || [],
      isCurrentTurn: gameState.currentTurn === p.id,
      currentBid: p.currentBid,
      tricks: p.tricks
    }));
  }, [gameState]);

  // Memoize played cards
  const playedCards = useMemo(() => {
    if (!gameState?.currentTrick) return [];
    return gameState.currentTrick;
  }, [gameState?.currentTrick]);

  // Handle next step - only advance manually
  const handleNextStep = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep <= tutorialSteps.length) {
      setCurrentStep(nextStep);
      setWaitingForInteraction(false);
    } else {
      onClose();
    }
  }, [currentStep, onClose]);

  // Handle previous step
  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle tutorial-specific bid submission
  const handleTutorialBid = useCallback(() => {
    if (currentStep === 4 && bidAmount >= 0) {
      setCompletedInteractions(prev => new Set([...prev, 'bid']));
      setWaitingForInteraction(true);
      // Don't auto-advance, wait for user to click Next
    }
  }, [currentStep, bidAmount]);

  // Handle tutorial card play
  const handleTutorialCardPlay = useCallback((card) => {
    if (currentStep === 7) {
      setCompletedInteractions(prev => new Set([...prev, 'playCard']));
      setWaitingForInteraction(true);
      // Don't auto-advance, wait for user to click Next
    } else if (currentStep === 11) {
      if (card.suit === 'HEARTS') {
        setCompletedInteractions(prev => new Set([...prev, 'playTrump']));
        setWaitingForInteraction(true);
        // Don't auto-advance, wait for user to click Next
      }
    }
  }, [currentStep]);

  // Remove the auto-advance useEffect - all steps should be manual now

  // Game info for Table component
  const gameInfo = useMemo(() => {
    if (!gameState) return {};
    
    return {
      roundInfo: `Round ${gameState.currentRound} / ${gameState.totalRounds}`,
      trumpSuit: gameState.trumpSuit,
      gameStatus: gameState.status === 'BIDDING' ? 'Bidding Phase' : 
                  gameState.status === 'PLAYING' ? 'Playing Phase' : 'Game Complete',
      isBidding: gameState.status === 'BIDDING',
      isCurrentUserTurn: gameState.currentTurn === '1'
    };
  }, [gameState]);

  if (!gameState) return null;

  return (
    <div className={styles.tutorialContainer}>
      {/* Tutorial Overlay */}
      {showOverlay && currentStepData && (
        <TutorialOverlay
          step={currentStepData}
          currentStep={currentStep}
          totalSteps={tutorialSteps.length}
          onNext={handleNextStep}
          onPrev={handlePrevStep}
          onSkip={onClose}
          highlight={currentStepData.highlight}
        />
      )}

      {/* Game Table */}
      <Table
        players={mappedPlayers}
        playedCards={playedCards}
        currentUserId="1"
        onCardClick={handleTutorialCardPlay}
        trickWinnerId={currentStep === 9 ? '1' : currentStep === 12 ? '1' : null}
        trumpSuit={gameInfo.trumpSuit}
        roundInfo={gameInfo.roundInfo}
        gameStatus={gameInfo.gameStatus}
        isBidding={gameInfo.isBidding}
        isCurrentUserTurn={gameInfo.isCurrentUserTurn}
        bidAmount={bidAmount}
        setBidAmount={setBidAmount}
        onSubmitBid={handleTutorialBid}
        bidError=""
        animating={false}
        gameFinished={currentStep >= 13}
        winner={currentStep === 14 ? mappedPlayers[0] : null}
        onNewGame={() => {}}
        activeCardAnimation={null}
        showRoundWinner={false}
        roundWinnerData={null}
      />
    </div>
  );
};

TutorialContainer.whyDidYouRender = true; // Enable WDYR for this component
TutorialContainer.displayName = 'CommprehensiveTutorial';
export default TutorialContainer;
