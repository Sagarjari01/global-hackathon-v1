import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from "react";
import styles from "../RevampedGame.module.css";

const placeholderAvatar =
  "https://api.dicebear.com/7.x/personas/svg?seed=player";

const getSuitSymbol = (suit) => {
  switch (suit) {
    case "HEARTS":
      return "♥";
    case "DIAMONDS":
      return "♦";
    case "CLUBS":
      return "♣";
    case "SPADES":
      return "♠";
    default:
      return "?";
  }
};

const getCardValue = (value) => {
  const map = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  return map[value] || value;
};

const formatBid = (bid) => {
  if (typeof bid === "number" && bid >= 0) {
    return bid;
  }
  return "–";
};

const formatTricks = (tricks) => {
  if (typeof tricks === "number") {
    return tricks;
  }
  return "0";
};

const PlayerCard = memo(
  ({
    card,
    index,
    isRed,
    isCurrentUserTurn,
    isBidding,
    onCardClick,
    cardWidth,
    overlap,
    isLastCard,
    isCardPlayPending,
    playedCard,
  }) => {
    const isPlayedCard = playedCard && playedCard.suit === card.suit && playedCard.value === card.value;
    const isDisabled = !isCurrentUserTurn || isBidding || isCardPlayPending;
    
    return (
      <div
        key={`${card.suit}-${card.value}`}
        className={`${styles.fanCardUser} ${isRed ? styles.red : ""} 
        ${isDisabled ? styles.disableHover : ""} 
        ${isCurrentUserTurn && !isBidding && !isCardPlayPending ? styles.playableCard : ""}
        ${isLastCard ? styles.lastCard : ""}
        ${isPlayedCard ? styles.playedCard : ""}`}
        style={{
          position: "absolute",
          left: `${index * (cardWidth - overlap)}px`,
          zIndex: index,
          transform: "none",
          margin: 0,
          opacity: isCardPlayPending && !isPlayedCard ? 0.5 : 1,
          transition: "opacity 0.2s ease-in-out",
        }}
        onClick={
          !isDisabled && onCardClick
            ? () => onCardClick(card)
            : undefined
        }
        aria-disabled={isDisabled}
        tabIndex={!isDisabled ? 0 : -1}
        aria-label={card.label}
      >
        <div className={styles.fanCardValue}>{getCardValue(card.value)}</div>
        <div className={styles.fanCardSuit}>{getSuitSymbol(card.suit)}</div>
        {isPlayedCard && (
          <div className={styles.cardPlayingIndicator}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>
    );
  }
);

const AICards = memo(({ cards }) => (
  <div
    className={styles.fanHandAI}
    style={{ width: `${15 + (cards.length - 1) * 8 + 15}px` }}
  >
    {cards.map((_, idx) => {
      const offset = idx - (cards.length - 1) / 2;
      const angle = offset * 4;
      const translateX = offset * 8;

      return (
        <div
          key={idx}
          className={styles.fanCardAI}
          style={{
            transform: `translateX(${translateX}px) rotate(${angle}deg)`,
            zIndex: idx,
            transformOrigin: "bottom center",
          }}
        >
          <div className={styles.fanCardAIPattern}></div>
        </div>
      );
    })}
  </div>
));

const TrickWinnerIndicator = memo(() => (
  <div className={styles.trickWinnerIndicator}>
    <span className={styles.trickWinnerIcon}>🏆</span>
    <span>Trick</span>
  </div>
));

const PlayerInfoBox = memo(
  ({
    name,
    score,
    bid,
    tricks,
    avatar,
    isCurrentTurn,
    isCurrentUser,
    additionalClasses = {},
  }) => (
    <div
      className={`${styles.playerInfoBox} ${
        additionalClasses.playerInfoBox || ""
      } ${isCurrentUser ? styles.currentUserInfoBox : ""}`}
    >
      <div className={styles.playerIdentity}>
        <div className={styles.avatarContainer}>
          <img
            src={avatar}
            alt={name}
            className={`${styles.avatar} ${additionalClasses.avatar || ""} ${
              isCurrentTurn ? styles.activeAvatar : ""
            }`}
          />
          {isCurrentTurn && <div className={styles.currentTurnRing}></div>}
        </div>

        <div className={styles.nameScoreContainer}>
          <div className={styles.playerName}>{name}</div>
          <div className={styles.playerScore}>{score}</div>
        </div>
      </div>

      <div className={styles.playerStats}>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>BID</div>
          <div
            className={
              typeof bid === "number" && bid >= 0
                ? styles.statValue + " " + styles.bidValue
                : styles.statValue + " " + styles.pendingBid
            }
          >
            {formatBid(bid)}
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>TRICKS</div>
          <div className={styles.statValue + " " + styles.trickValue}>
            {formatTricks(tricks)}
          </div>
        </div>
      </div>
    </div>
  )
);

const PlayerSeat = memo(
  ({
    avatar = placeholderAvatar,
    name,
    score,
    cards = [],
    isCurrentUser = false,
    isCurrentTurn = false,
    isWinner = false,
    position = {},
    overlapEdge = false,
    pos = "bottom",
    tricks,
    bid,
    onCardClick,
    isBidding,
    isCurrentUserTurn,
    activeCardAnimation,
    additionalClasses = {},
  }) => {
    const [showTrickWin, setShowTrickWin] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isCardPlayPending, setIsCardPlayPending] = useState(false);
    const [playedCard, setPlayedCard] = useState(null);
    const [showPlayingMessage, setShowPlayingMessage] = useState(false);
    const [lastClickTime, setLastClickTime] = useState(0);
    const trickWinTimeoutRef = useRef(null);
    const transitionTimeoutRef = useRef(null);
    const cardPlayTimeoutRef = useRef(null);
    const playingMessageTimeoutRef = useRef(null);

    const effectDependencies = useMemo(
      () => ({
        isWinner,
        isCurrentTurn,
        isCurrentUserTurn,
      }),
      [isWinner, isCurrentTurn, isCurrentUserTurn]
    );

    useEffect(() => {
      if (trickWinTimeoutRef.current) {
        clearTimeout(trickWinTimeoutRef.current);
        trickWinTimeoutRef.current = null;
      }

      if (effectDependencies.isWinner) {
        console.log("TTTTTTTTTTTT");
        setShowTrickWin(true);
        trickWinTimeoutRef.current = setTimeout(() => {
          setShowTrickWin(false);
        }, 3000);
      } else {
        setShowTrickWin(false);
      }

      if (effectDependencies.isCurrentTurn) {
        setIsTransitioning(true);
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
        }, 150);
      } else {
        setIsTransitioning(false);
      }

      // Reset card play pending state when it's no longer the user's turn
      if (!effectDependencies.isCurrentUserTurn) {
        setIsCardPlayPending(false);
        setPlayedCard(null);
        setShowPlayingMessage(false);
        setLastClickTime(0);
        if (cardPlayTimeoutRef.current) {
          clearTimeout(cardPlayTimeoutRef.current);
          cardPlayTimeoutRef.current = null;
        }
        if (playingMessageTimeoutRef.current) {
          clearTimeout(playingMessageTimeoutRef.current);
          playingMessageTimeoutRef.current = null;
        }
      }

      return () => {
        if (trickWinTimeoutRef.current) {
          clearTimeout(trickWinTimeoutRef.current);
        }
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
        if (cardPlayTimeoutRef.current) {
          clearTimeout(cardPlayTimeoutRef.current);
        }
        if (playingMessageTimeoutRef.current) {
          clearTimeout(playingMessageTimeoutRef.current);
        }
      };
    }, [effectDependencies]);

    const handleCardClick = useCallback(
      (card) => {
        const currentTime = Date.now();
        
        // Prevent multiple card clicks when a play is already pending or rapid clicks within 500ms
        if (!isBidding && isCurrentUserTurn && onCardClick && !isCardPlayPending && 
            (currentTime - lastClickTime > 500)) {
          
          setLastClickTime(currentTime);
          setIsCardPlayPending(true);
          setPlayedCard(card);
          setShowPlayingMessage(true);
          
          // Hide the message after 2 seconds
          if (playingMessageTimeoutRef.current) {
            clearTimeout(playingMessageTimeoutRef.current);
          }
          playingMessageTimeoutRef.current = setTimeout(() => {
            setShowPlayingMessage(false);
          }, 2000);
          
          // Set a shorter timeout to reset pending state if no response after 3 seconds
          if (cardPlayTimeoutRef.current) {
            clearTimeout(cardPlayTimeoutRef.current);
          }
          cardPlayTimeoutRef.current = setTimeout(() => {
            console.warn('Card play timeout - resetting pending state');
            setIsCardPlayPending(false);
            setPlayedCard(null);
            setShowPlayingMessage(false);
          }, 3000); // Reduced from 10 seconds to 3 seconds
          
          requestAnimationFrame(() => {
            onCardClick(card);
          });
        }
      },
      [isBidding, isCurrentUserTurn, onCardClick, isCardPlayPending, lastClickTime]
    );

    const playerCardsSection = useMemo(() => {
      if (!isCurrentUser || cards.length === 0) return null;

      const cardWidth = 50;
      const overlap = 24;
      const totalWidth = cardWidth + (cards.length - 1) * (cardWidth - overlap);

      return (
        <div
          className={styles.straightHand}
          data-tutorial="player-hand"
          style={{
            width: `${totalWidth}px`,
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "10px",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {cards.map((card, index) => {
            const isRed = card.suit === "HEARTS" || card.suit === "DIAMONDS";
            return (
              <PlayerCard
                key={`${card.suit}-${card.value}`}
                card={card}
                index={index}
                isRed={isRed}
                isCurrentUserTurn={isCurrentUserTurn}
                isBidding={isBidding}
                onCardClick={handleCardClick}
                cardWidth={cardWidth}
                overlap={overlap}
                isLastCard={index === cards.length - 1}
                isCardPlayPending={isCardPlayPending}
                playedCard={playedCard}
              />
            );
          })}
        </div>
      );
    }, [cards, isCurrentUser, isCurrentUserTurn, isBidding, handleCardClick, isCardPlayPending, playedCard]);

    const seatClassNames = useMemo(() => {
      return `${styles.playerSeat} ${styles["playerSeat--edge"]} ${
        isCurrentTurn ? styles.turnIndicator : ""
      } ${isTransitioning ? styles.transitioning : ""}`;
    }, [isCurrentTurn, isTransitioning]);

    return (
      <div
        className={seatClassNames}
        style={{
          ...position,
          transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        data-pos={pos}
      >
        {showTrickWin && <TrickWinnerIndicator />}
        
        {showPlayingMessage && (
          <div className={styles.playingMessageOverlay}>
            <div className={styles.playingMessage}>
              <div className={styles.playingSpinner}></div>
              <span>Playing card...</span>
            </div>
          </div>
        )}

        {playerCardsSection}

        <PlayerInfoBox
          name={name}
          score={score}
          bid={bid}
          tricks={tricks}
          avatar={avatar}
          isCurrentTurn={isCurrentTurn}
          isCurrentUser={isCurrentUser}
          additionalClasses={{
            ...additionalClasses,
            playerInfoBox: `${additionalClasses.playerInfoBox || ""} ${
              isTransitioning ? styles.transitioning : ""
            }`,
          }}
        />

        {!isCurrentUser && cards.length > 0 && <AICards cards={cards} />}

        {isCurrentTurn && !isCurrentUser && (
          <div className={styles.aiTurnIndicator}></div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isWinner === nextProps.isWinner &&
      prevProps.isCurrentTurn === nextProps.isCurrentTurn &&
      prevProps.isCurrentUserTurn === nextProps.isCurrentUserTurn &&
      prevProps.isBidding === nextProps.isBidding &&
      prevProps.score === nextProps.score &&
      prevProps.bid === nextProps.bid &&
      prevProps.tricks === nextProps.tricks &&
      prevProps.cards.length === nextProps.cards.length &&
      prevProps.activeCardAnimation?.card ===
        nextProps.activeCardAnimation?.card
    );
  }
);

// Enable why-did-you-render tracking for this component
PlayerSeat.whyDidYouRender = true;

export default PlayerSeat;
