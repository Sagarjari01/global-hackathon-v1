import React, { useState, useMemo, useCallback, memo } from 'react';
import styles from '../RevampedGame.module.css';
import PlayerSeat from './PlayerSeat';
import LeaderboardPopup from './LeaderboardPopup';
import ToastNotification from './ToastNotification';
import AudioPlayer from '../AudioPlayer';

// Player positions are now calculated dynamically using the getSeatPosition function
// which positions players evenly around the table in an elliptical arrangement.

// Seat positioning helper - pure function for memoization
const getSeatPosition = (seatIndex, totalSeats, isCurrentUser) => {
  // Calculate position in an ellipse around the table border
  // We evenly distribute all players around the table starting from the bottom center position
  
  // Calculate the total angle (360°) divided by the number of players
  const anglePerPlayer = 360 / totalSeats;
  
  // For current user, always position at bottom center (90° in standard polar coordinates)
  // Note: In CSS, 90° is bottom center, not 270° as in standard math coordinates
  if (isCurrentUser) {
    const angleInRadians = (90 * Math.PI) / 180;
    const x = 50 + 50 * Math.cos(angleInRadians);
    const y = 50 + 50 * Math.sin(angleInRadians);
    
    return { 
      left: `${x}%`, 
      top: `${y}%`, 
      transform: 'translate(-50%, -50%)' 
    };
  } else {
    // For other players, we need to calculate their position based on the current user's position
    // The current user is always at index 0, at 90 degrees (bottom center)
    // Other players are positioned evenly around the table
    
    // Starting angle (90° for bottom center where current user is)
    const startAngle = 90;
    
    // Calculate angle for this player (adding angles clockwise)
    // We add seatIndex+1 to skip the current user's position
    let angle = (startAngle + (seatIndex + 1) * anglePerPlayer) % 360;
    
    // Convert to radians
    const angleInRadians = (angle * Math.PI) / 180;
    
    // Calculate the position using parametric ellipse equations
    // We use semi-major axis of 50% (horizontal) and semi-minor axis of 50% (vertical)
    const x = 50 + 50 * Math.cos(angleInRadians);
    const y = 50 + 50 * Math.sin(angleInRadians);
    
    // Return position with CSS percentage values
    return { 
      left: `${x}%`, 
      top: `${y}%`,
      transform: 'translate(-50%, -50%)' // Center the player element at the calculated point
    };
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
          disabled={true}
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
  pendingCard
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
        pos={isCurrentUserPlayer ? 'bottom' : `player-${idx}`}
        tricks={player.tricks}
        bid={player.currentBid}
        onCardClick={!gameFinished && isCurrentUserPlayer ? onCardClick : undefined}
        isBidding={isBidding && !gameFinished}
        isCurrentUserTurn={isCurrentUserTurn && !gameFinished && isCurrentUserPlayer}
        pendingCard={isCurrentUserPlayer ? pendingCard : null}
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
  pendingCard
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
      <div className={styles.gameHeaderContainer}>
      <GameHeader 
        gameFinished={gameFinished} 
        roundInfo={roundInfo} 
        gameStatus={gameStatus} 
      />
      
      {/* Trump Suit Display */}
      {trumpSuit && !gameFinished && <TrumpSuitDisplay trumpSuit={trumpSuit} />}
      </div>
      
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
            pendingCard={pendingCard}
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
            pendingCard={null}
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
