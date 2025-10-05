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
    pendingCard,
    totalCards,
  }) => {
    const isPendingCard = pendingCard && pendingCard.suit === card.suit && pendingCard.value === card.value;
    const isDisabled = !isCurrentUserTurn || isBidding || !!pendingCard;
    
    console.log("PlayerCard Debug:", {
      cardLabel: `${card.value} of ${card.suit}`,
      isCurrentUserTurn,
      isBidding,
      pendingCard: pendingCard ? `${pendingCard.value} of ${pendingCard.suit}` : null,
      isDisabled,
      isPendingCard
    });
    
    // Calculate fan positioning and rotation
    const centerIndex = (totalCards - 1) / 2;
    const offsetFromCenter = index - centerIndex;
    const maxAngle = 6; // Reduced maximum rotation angle for better alignment
    const rotation = totalCards > 1 ? (offsetFromCenter * maxAngle) / Math.max(1, Math.ceil(centerIndex)) : 0;
    
    // Calculate spacing - keep all cards on same line
    const baseSpacing = cardWidth - overlap;
    return (
      <div
        key={`${card.suit}-${card.value}`}
        className={`${styles.fanCardUser} ${isRed ? styles.red : ""} 
        ${isCurrentUserTurn && !isBidding && !pendingCard ? styles.playableCard : ""}
        ${isLastCard ? styles.lastCard : ""}
        `}
        style={{
          position: "absolute",
          left: `${index * baseSpacing}px`,
          bottom: "0px", // Keep all cards on the same baseline
          zIndex: index,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center bottom",
          margin: 0,
          opacity: 1,
          transition: "all 0.2s ease-in-out",
          '--card-rotation': `${rotation}deg`,
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
        {isPendingCard && (
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
    pendingCard,
    additionalClasses = {},
  }) => {
    const [showTrickWin, setShowTrickWin] = useState(false);
    const trickWinTimeoutRef = useRef(null);

    useEffect(() => {
      if (trickWinTimeoutRef.current) {
        clearTimeout(trickWinTimeoutRef.current);
        trickWinTimeoutRef.current = null;
      }

      if (isWinner) {
        setShowTrickWin(true);
        trickWinTimeoutRef.current = setTimeout(() => {
          setShowTrickWin(false);
        }, 3000);
      } else {
        setShowTrickWin(false);
      }

      return () => {
        if (trickWinTimeoutRef.current) {
          clearTimeout(trickWinTimeoutRef.current);
        }
      };
    }, [isWinner]);

    const handleCardClick = useCallback(
      (card) => {
        if (!isBidding && isCurrentUserTurn && onCardClick && !pendingCard) {
          onCardClick(card);
        }
      },
      [isBidding, isCurrentUserTurn, onCardClick, pendingCard]
    );

    const playerCardsSection = useMemo(() => {
      if (!isCurrentUser || cards.length === 0) return null;

      // Responsive card sizing based on screen size
      const getCardDimensions = () => {
        if (window.innerWidth <= 360) {
          return { cardWidth: 35, overlap: 15 };
        } else if (window.innerWidth <= 480) {
          return { cardWidth: 40, overlap: 18 };
        } else if (window.innerWidth <= 576) {
          return { cardWidth: 45, overlap: 20 };
        } else if (window.innerWidth <= 768) {
          return { cardWidth: 50, overlap: 22 };
        } else {
          return { cardWidth: 50, overlap: 20 };
        }
      };

      const { cardWidth, overlap } = getCardDimensions();
      const totalWidth = cardWidth + (cards.length - 1) * (cardWidth - overlap);
      const maxScreenWidth = window.innerWidth * 0.9; // 90% of screen width
      const adjustedWidth = Math.min(totalWidth, maxScreenWidth);

      return (
        <div
          className={styles.fanHandUser}
          data-tutorial="player-hand"
          style={{
            width: `${adjustedWidth}px`,
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
                pendingCard={pendingCard}
                totalCards={cards.length}
              />
            );
          })}
        </div>
      );
    }, [cards, isCurrentUser, isCurrentUserTurn, isBidding, handleCardClick, pendingCard]);

    const seatClassNames = useMemo(() => {
      return `${styles.playerSeat} ${styles["playerSeat--edge"]} ${
        isCurrentTurn ? styles.turnIndicator : ""
      }`;
    }, [isCurrentTurn]);

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

        {playerCardsSection}

        <PlayerInfoBox
          name={name}
          score={score}
          bid={bid}
          tricks={tricks}
          avatar={avatar}
          isCurrentTurn={isCurrentTurn}
          isCurrentUser={isCurrentUser}
          additionalClasses={additionalClasses}
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
      prevProps.pendingCard === nextProps.pendingCard
    );
  }
);

// Enable why-did-you-render tracking for this component
PlayerSeat.whyDidYouRender = true;

export default PlayerSeat;
