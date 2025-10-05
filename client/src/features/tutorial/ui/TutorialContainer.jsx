import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table } from '../../game/ui';
import { avatars } from '../../game/ui/avatars';
import TutorialOverlay from './TutorialOverlay';
import styles from './Tutorial.module.css';

// Tutorial game state that progresses through different phases
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

  // Modify state based on tutorial step
  switch (step) {
    case 1: // Game overview
      return {
        ...baseState,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          cards: idx === 0 ? [{ value: 14, suit: 'SPADES', label: 'A♠' }] : []
        }))
      };
    
    case 2: // Bidding phase explanation
      return {
        ...baseState,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          cards: idx === 0 ? [{ value: 14, suit: 'SPADES', label: 'A♠' }] : []
        })),
        currentTurn: '1'
      };
    
    case 3: // Bidding restrictions
      return {
        ...baseState,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: idx === 1 ? 1 : idx === 2 ? 0 : null,
          cards: idx === 0 ? [{ value: 14, suit: 'SPADES', label: 'A♠' }] : []
        })),
        currentTurn: '4' // Last player to bid
      };
    
    case 4: // Playing phase
      return {
        ...baseState,
        status: 'PLAYING',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 0, 0][idx],
          cards: idx === 0 ? [
            { value: 14, suit: 'SPADES', label: 'A♠' },
            { value: 7, suit: 'HEARTS', label: '7♥' },
            { value: 10, suit: 'CLUBS', label: '10♣' }
          ] : []
        })),
        currentTurn: '1'
      };
    
    case 5: // Trick taking example
      return {
        ...baseState,
        status: 'PLAYING',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 0, 0][idx],
          cards: idx === 0 ? [
            { value: 7, suit: 'HEARTS', label: '7♥' },
            { value: 10, suit: 'CLUBS', label: '10♣' }
          ] : []
        })),
        currentTrick: [
          { value: 14, suit: 'SPADES', label: 'A♠' }, // Your card
          { value: 5, suit: 'SPADES', label: '5♠' },  // Alice
          { value: 2, suit: 'HEARTS', label: '2♥' },  // Bob (no spades)
          { value: 3, suit: 'SPADES', label: '3♠' }   // Charlie
        ],
        currentTurn: '2'
      };
    
    case 6: // Trump suit example
      return {
        ...baseState,
        status: 'PLAYING',
        trumpSuit: 'HEARTS',
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          currentBid: [1, 0, 0, 0][idx],
          cards: idx === 0 ? [
            { value: 2, suit: 'HEARTS', label: '2♥' }
          ] : []
        })),
        currentTrick: [
          { value: 14, suit: 'CLUBS', label: 'A♣' },  // Alice starts
          { value: 13, suit: 'CLUBS', label: 'K♣' },  // Bob
          { value: 12, suit: 'CLUBS', label: 'Q♣' }   // Charlie
        ],
        currentTurn: '1'
      };
    
    case 7: // Scoring explanation
      return {
        ...baseState,
        status: 'FINISHED',
        currentRound: 2,
        players: baseState.players.map((p, idx) => ({
          ...p,
          avatar: avatars[idx],
          score: [11, 0, 0, 10][idx], // You got your bid, Charlie got his
          currentBid: [1, 0, 0, 1][idx],
          tricks: [1, 0, 0, 1][idx]
        }))
      };
    
    default:
      return baseState;
  }
};

const tutorialSteps = [
  {
    id: 1,
    title: "Welcome to Judgment Card Game!",
    content: "Judgment is a trick-taking card game where you must predict exactly how many tricks you'll win each round. Let's learn the basics!",
    position: "center"
  },
  {
    id: 2,
    title: "Bidding Phase",
    content: "At the start of each round, players bid on how many tricks they think they'll win. In Round 1, you have 1 card, so you can bid 0 or 1.",
    highlight: "biddingControls",
    position: "bottom"
  },
  {
    id: 3,
    title: "Bidding Restrictions",
    content: "The last player to bid (highlighted) cannot make a bid that would make the total bids equal to the number of cards. Here, Alice bid 1, Bob bid 0, so Charlie cannot bid 0 (total would be 1).",
    highlight: "currentPlayer",
    position: "top"
  },
  {
    id: 4,
    title: "Playing Phase",
    content: "After bidding, players take turns playing cards. You must follow the suit of the first card played if you have it. Click a card to play it!",
    highlight: "currentPlayerHand",
    position: "top"
  },
  {
    id: 5,
    title: "Winning Tricks",
    content: "The highest card of the suit led wins the trick. Here, your Ace of Spades wins because it's the highest spade played, even though Bob played a different suit.",
    highlight: "centerArea",
    position: "center"
  },
  {
    id: 6,
    title: "Trump Suit Power",
    content: "Trump suit (Hearts this round) beats all other suits! Even your small 2 of Hearts would win this trick against all the Clubs. Trump is shown in the top right.",
    highlight: "trumpSuit",
    position: "left"
  },
  {
    id: 7,
    title: "Scoring",
    content: "If you make exactly your bid, you get your bid + 10 points. Miss your bid = 0 points. You bid 1 and won 1 trick = 11 points. Charlie also made his bid!",
    highlight: "playerStats",
    position: "bottom"
  }
];

const TutorialContainer = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [gameState, setGameState] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [bidAmount, setBidAmount] = useState(0);
  const [tutorialBids, setTutorialBids] = useState({});

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

  // Handle next step
  const handleNextStep = useCallback(() => {
    if (currentStep < tutorialSteps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      onFinish();
    }
  }, [currentStep, onFinish]);

  // Handle previous step
  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle tutorial-specific bid submission
  const handleTutorialBid = useCallback(() => {
    if (currentStep === 2) {
      // Simulate bid submission
      setTutorialBids(prev => ({ ...prev, '1': bidAmount }));
      handleNextStep();
    }
  }, [currentStep, bidAmount, handleNextStep]);

  // Handle tutorial card play
  const handleTutorialCardPlay = useCallback((card) => {
    if (currentStep === 4) {
      // Simulate card play and advance to next step
      setTimeout(handleNextStep, 1000);
    } else if (currentStep === 6) {
      // Simulate trump card play
      setTimeout(handleNextStep, 1000);
    }
  }, [currentStep, handleNextStep]);

  // Game info for Table component
  const gameInfo = useMemo(() => {
    if (!gameState) return {};
    
    return {
      roundInfo: `Round ${gameState.currentRound} / ${gameState.totalRounds}`,
      trumpSuit: gameState.trumpSuit,
      gameStatus: gameState.status === 'BIDDING' ? 'Bidding Phase' : 'Playing Phase',
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
          onSkip={onFinish}
          highlight={currentStepData.highlight}
        />
      )}

      {/* Game Table */}
      <Table
        players={mappedPlayers}
        playedCards={playedCards}
        currentUserId="1"
        onCardClick={handleTutorialCardPlay}
        trickWinnerId={currentStep === 5 ? '1' : null}
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
        gameFinished={currentStep === 7}
        winner={null}
        onNewGame={() => {}}
        activeCardAnimation={null}
        showRoundWinner={false}
        roundWinnerData={null}
      />
    </div>
  );
};

TutorialContainer.whyDidYouRender = true; // Enable WDYR for this component
export default TutorialContainer;
