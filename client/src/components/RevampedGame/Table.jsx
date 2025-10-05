import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import styles from '../RevampedGame.module.css';
import PlayerSeat from './PlayerSeat';
import LeaderboardPopup from './LeaderboardPopup';
import ToastNotification from './ToastNotification';
import AudioPlayer from '../AudioPlayer';

// Define more precise seating positions for different player counts
// const seatPositions = [
//   'bottom', 'right', 'top', 'left', 'top-right', 'top-left', 'bottom-left', 'bottom-right'
// ];

// Get optimal seat positions based on total player count - moved outside for better caching
const getOptimalPositions = (totalPlayers) => {
  switch (totalPlayers) {
    case 3: return ['bottom', 'top-left', 'top-right'];
    case 4: return ['bottom', 'left', 'top', 'right'];
    case 5: return ['bottom', 'left', 'top-left', 'top-right', 'right'];
    case 6: return ['bottom', 'bottom-left', 'top-left', 'top-right', 'right', 'bottom-right'];
    case 7: return ['bottom', 'bottom-left', 'left', 'top-left', 'top', 'top-right', 'right'];
    case 8: return ['bottom', 'bottom-left', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-right'];
    default: return ['bottom', 'left', 'top', 'right'];
  }
};

// Seat positioning helper - pure function for memoization
const getSeatPosition = (seatIndex, totalSeats, isCurrentUser) => {
  if (isCurrentUser) {
    return { left: '50%', top: '100%' };
  }

  // Get optimized positions based on player count
  const positions = getOptimalPositions(totalSeats).filter(p => p !== 'bottom');
  const pos = positions[seatIndex % positions.length];
  
  switch (pos) {
    case 'top': return { left: '50%', top: '0%' };
    case 'left': return { left: '0%', top: '50%', transform: 'translateY(-50%)' };
    case 'right': return { left: '100%', top: '50%', transform: 'translateY(-50%)' };
    case 'top-right': return { left: '80%', top: '15%' };
    case 'top-left': return { left: '20%', top: '15%' };
    case 'bottom-left': return { left: '20%', top: '85%' };
    case 'bottom-right': return { left: '80%', top: '85%' };
    default: return { left: '50%', top: '0%' };
  }
};

// Animation helpers extracted as pure functions
const generateConfetti = (count = 30) => {
  const colors = ['#ffd700', '#ff4500', '#4caf50', '#2196f3', '#9c27b0', '#e91e63'];
  
  return Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;
    const fallDuration = 3 + Math.random() * 3;
    const shakeDuration = 0.5 + Math.random() * 0.5;
    const shakeDistance = -15 + Math.random() * 30;
    const rotation = -180 + Math.random() * 360;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return {
      id: `confetti-${i}`,
      style: {
        left: `${left}%`,
        top: `${Math.random() * 40}%`,
        backgroundColor: color,
        '--fall-duration': `${fallDuration}s`,
        '--shake-duration': `${shakeDuration}s`,
        '--shake-distance': `${shakeDistance}px`,
        '--rotation': `${rotation}deg`,
        '--color': color,
        animationDelay: `${Math.random() * 3}s`
      }
    };
  });
};

// Card component extracted for better performance
const GameCard = memo(({ card, isLastCard }) => {
  const isRed = card.label.includes('♥') || card.label.includes('♦');
  const style = isRed ? { color: '#d40000' } : {};
  
  // Extract the value and suit
  const value = card.label.replace(/[♥♦♣♠]/, '');
  const suit = card.label.match(/[♥♦♣♠]/)?.[0] || '';
  
  return (
    <div className={`${styles.card} ${styles.played} ${isLastCard ? styles.lastCard : ''}`} style={style}>
      <div className={styles.cardValue}>{value}</div>
      <div className={styles.cardSuit}>{suit}</div>
    </div>
  );
});

// Suit display component
const SuitDisplay = memo(({ suit }) => {
  if (suit === 'HEARTS') return <span className={styles.redSuit}>♥</span>;
  if (suit === 'DIAMONDS') return <span className={styles.redSuit}>♦</span>;
  if (suit === 'CLUBS') return <span>♣</span>;
  if (suit === 'SPADES') return <span>♠</span>;
  return <span>?</span>;
});

// Fireworks animation component - removed as it's not used

// Confetti animation component
const ConfettiAnimation = memo(({ confetti }) => (
  <div className={styles.winnerConfetti}>
    {confetti.map(piece => (
      <div 
        key={piece.id} 
        className={styles.confettiPiece} 
        style={piece.style} 
      />
    ))}
  </div>
));

// Game header component
const GameHeader = memo(({ gameFinished, roundInfo, gameStatus }) => (
  <div className={gameFinished ? `${styles.gameHeader} ${styles.gameFinishedHeader}` : styles.gameHeader}>
    {gameFinished ? (
      <div className={styles.gameFinished}>
        <span className={styles.gameFinishedEmoji}>🏆</span>
        Game Finished
      </div>
    ) : (
      <div className={styles.roundInfoBox}>
        <div className={styles.roundNumber}>{roundInfo}</div>
        <div className={styles.gamePhase}>{gameStatus}</div>
      </div>
    )}
  </div>
));

// Trump suit display component
const TrumpSuitDisplay = memo(({ trumpSuit }) => (
  <div className={styles.trumpSuitBox} title="Trump Suit">
    <SuitDisplay suit={trumpSuit} />
  </div>
));

// Memoize the additionalClasses object
const getAdditionalClasses = (isWinner) => ({
  playerInfoBox: isWinner ? styles.winnerPlayerInfoBox : '',
  avatar: isWinner ? styles.winnerAvatar : ''
});

// Memoize the position calculation
const getPlayerPosition = (idx, totalPlayers, isCurrentUserPlayer) => {
  return {
    position: 'absolute',
    ...getSeatPosition(idx, totalPlayers, isCurrentUserPlayer)
  };
};

// Memoize the BiddingControls component with useCallback for its handlers
const BiddingControls = memo(({ bidAmount, setBidAmount, onSubmitBid, bidError, animating }) => {
  const handleDecrease = useCallback(() => {
    setBidAmount(Math.max(0, bidAmount - 1));
  }, [bidAmount, setBidAmount]);

  const handleIncrease = useCallback(() => {
    setBidAmount(bidAmount + 1);
  }, [bidAmount, setBidAmount]);

  const handleInputChange = useCallback((e) => {
    setBidAmount(Number(e.target.value));
  }, [setBidAmount]);

  return (
    <div className={styles.biddingCenter}>
      <div className={styles.biddingTitle}>Place Your Bid</div>
      {bidError && <div className={styles.biddingError}>{bidError}</div>}
      <div className={styles.biddingControls}>
        <button 
          className={styles.bidButton}
          onClick={handleDecrease} 
          disabled={bidAmount <= 0 || animating}
        >
          –
        </button>
        <input 
          type="number" 
          min={0} 
          max={10} 
          value={bidAmount} 
          onChange={handleInputChange} 
          disabled={animating}
          className={styles.bidInput}
        />
        <button 
          className={styles.bidButton}
          onClick={handleIncrease} 
          disabled={animating}
        >
          +
        </button>
      </div>
      <button 
        onClick={onSubmitBid} 
        disabled={animating} 
        className={styles.submitButton}
      >
        {animating ? 'Submitting...' : 'Submit Bid'}
      </button>
    </div>
  );
});

// Memoize the PlayerSection component
const PlayerSection = memo(({ 
  player, 
  idx, 
  isCurrentUserPlayer, 
  totalPlayers,
  isWinner,
  confetti,
  trickWinnerId,
  gameFinished,
  isBidding,
  isCurrentUserTurn,
  onCardClick,
  activeCardAnimation
}) => {
  const position = useMemo(() => 
    getPlayerPosition(idx, totalPlayers, isCurrentUserPlayer),
    [idx, totalPlayers, isCurrentUserPlayer]
  );

  const additionalClasses = useMemo(() => 
    getAdditionalClasses(isWinner),
    [isWinner]
  );

  return (
    <div 
      className={isWinner ? styles.winnerPlayer : ''}
      style={position}
    >
      {isWinner && (
        <>
          <div className={styles.winnerCrown}>👑</div>
          <ConfettiAnimation confetti={confetti} />
        </>
      )}
      <PlayerSeat
        avatar={player.avatar}
        name={player.name}
        score={player.score}
        cards={player.cards}
        isCurrentUser={isCurrentUserPlayer}
        isCurrentTurn={player.isCurrentTurn && !gameFinished}
        isWinner={player.id === trickWinnerId}
        position={{}}
        pos={isCurrentUserPlayer ? 'bottom' : getOptimalPositions(totalPlayers).filter(p => p !== 'bottom')[idx % (totalPlayers - 1)]}
        tricks={player.tricks}
        bid={player.currentBid}
        onCardClick={!gameFinished && isCurrentUserPlayer ? onCardClick : undefined}
        isBidding={isBidding && !gameFinished}
        isCurrentUserTurn={isCurrentUserTurn && !gameFinished && isCurrentUserPlayer}
        activeCardAnimation={activeCardAnimation && activeCardAnimation.playerId === player.id ? 
          activeCardAnimation.card : null}
        additionalClasses={additionalClasses}
      />
    </div>
  );
});

// AI thinking indicator component
const ThinkingIndicator = memo(() => (
  <div className={styles.aiThinkingIndicator}>
    <div className={styles.aiThinkingDot}></div>
    <div className={styles.aiThinkingDot}></div>
    <div className={styles.aiThinkingDot}></div>
  </div>
));

// Main Table component
const Table = ({ 
  players, 
  playedCards, 
  currentUserId, 
  onCardClick, 
  trickWinnerId, 
  trumpSuit, 
  roundInfo, 
  gameStatus, 
  isBidding, 
  isCurrentUserTurn, 
  bidAmount, 
  setBidAmount, 
  onSubmitBid, 
  bidError, 
  animating, 
  gameFinished, 
  winner, 
  onNewGame,
  activeCardAnimation,
  showRoundWinner,
  roundWinnerData
}) => {
  // Memoize player data
  const { currentUser, otherPlayers, totalPlayers } = useMemo(() => ({
    currentUser: players.find(p => p.id === currentUserId),
    otherPlayers: players.filter(p => p.id !== currentUserId),
    totalPlayers: players.length
  }), [players, currentUserId]);
  
  // Memoize confetti
  const confetti = useMemo(() => {
    if (gameFinished && winner) {
      return generateConfetti(50);
    }
    return [];
  }, [gameFinished, winner]);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);
  
  // Show toast notification when round winner is announced
  useEffect(() => {
    if (!showRoundWinner || !roundWinnerData) return;
    
    setToastMessage({
      type: 'roundComplete',
      title: `Round ${roundWinnerData.roundNumber} Completed!`,
      playerName: roundWinnerData.winner.name,
      points: roundWinnerData.scoreChange
    });
  }, [showRoundWinner, roundWinnerData]);
  
  // Memoize the isWinningPlayer callback
  const isWinningPlayer = useCallback((player) => {
    return gameFinished && winner && player.id === winner.id;
  }, [gameFinished, winner]);

  // Memoize the onCardClick callback
  const handleCardClick = useCallback((card) => {
    if (!gameFinished && isCurrentUserTurn) {
      onCardClick(card);
    }
  }, [gameFinished, isCurrentUserTurn, onCardClick]);

  const renderPlayedCards = useMemo(() => {
    if (!playedCards || playedCards.length === 0) return null;

    return (
      <div className={styles.centerArea} data-tutorial="center-area">
        {playedCards.map((card, index) => (
          <GameCard 
            key={`${card.suit}-${card.value}-${index}`}
            card={card}
            isLastCard={index === playedCards.length - 1}
          />
        ))}
      </div>
    );
  }, [playedCards]);
  
  return (
    <div className={styles.tableContainer}>
      <AudioPlayer />
      
      {/* Toast Notification */}
      {toastMessage && (
        <ToastNotification 
          message={toastMessage} 
          onClose={() => setToastMessage(null)} 
        />
      )}
      
      {/* Game Header */}
      <GameHeader 
        gameFinished={gameFinished} 
        roundInfo={roundInfo} 
        gameStatus={gameStatus} 
      />
      
      {/* Trump Suit Display */}
      {trumpSuit && !gameFinished && <TrumpSuitDisplay trumpSuit={trumpSuit} />}
      
      <div className={styles.pokerTable}>
        {/* Leaderboard Popup */}
        {gameFinished && <LeaderboardPopup players={players} onNewGame={onNewGame} />}
        
        {/* Players */}
        {currentUser && (
          <PlayerSection
            player={currentUser}
            idx={0}
            isCurrentUserPlayer={true}
            totalPlayers={totalPlayers}
            isWinner={isWinningPlayer(currentUser)}
            confetti={confetti}
            trickWinnerId={trickWinnerId}
            gameFinished={gameFinished}
            isBidding={isBidding}
            isCurrentUserTurn={isCurrentUserTurn}
            onCardClick={handleCardClick}
            activeCardAnimation={activeCardAnimation}
          />
        )}
        
        {otherPlayers.map((player, idx) => (
          <PlayerSection
            key={player.id}
            player={player}
            idx={idx}
            isCurrentUserPlayer={false}
            totalPlayers={totalPlayers}
            isWinner={isWinningPlayer(player)}
            confetti={confetti}
            trickWinnerId={trickWinnerId}
            gameFinished={gameFinished}
            isBidding={isBidding}
            isCurrentUserTurn={isCurrentUserTurn}
            onCardClick={handleCardClick}
            activeCardAnimation={activeCardAnimation}
          />
        ))}
        
        {/* Played Cards in Center */}
        {renderPlayedCards}
        
        {/* Thinking Indicator when AI is taking turn */}
        {animating && !isBidding && !gameFinished && <ThinkingIndicator />}
        
        {/* Bidding Controls */}
        {isBidding && isCurrentUserTurn && !gameFinished && (
          <BiddingControls
            bidAmount={bidAmount}
            setBidAmount={setBidAmount}
            onSubmitBid={onSubmitBid}
            bidError={bidError}
            animating={animating}
          />
        )}
      </div>
    </div>
  );
};

export default memo(Table);
