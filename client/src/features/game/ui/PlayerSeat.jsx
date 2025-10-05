import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from "react";
import styles from "./Game.module.css";
import useViewportWidth from "./hooks/useViewportWidth";
import PlayerCard from "./components/PlayerCard";
import AICards from "./components/AICards";
import TrickWinnerIndicator from "./components/TrickWinnerIndicator";
import PlayerInfoBox from "./components/PlayerInfoBox";

const placeholderAvatar =
  "https://api.dicebear.com/7.x/personas/svg?seed=player";

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
    const viewportWidth = useViewportWidth();
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
        if (viewportWidth <= 360) {
          return { cardWidth: 35, overlap: 15 };
        } else if (viewportWidth <= 480) {
          return { cardWidth: 40, overlap: 18 };
        } else if (viewportWidth <= 576) {
          return { cardWidth: 45, overlap: 20 };
        } else if (viewportWidth <= 768) {
          return { cardWidth: 50, overlap: 22 };
        } else {
          return { cardWidth: 50, overlap: 20 };
        }
      };

      const { cardWidth, overlap } = getCardDimensions();
      const totalWidth =
        cardWidth + (cards.length - 1) * (cardWidth - overlap);
      const maxScreenWidth = viewportWidth * 0.9; // 90% of screen width
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
            const isRed =
              card.suit === "HEARTS" || card.suit === "DIAMONDS";
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
    }, [
      cards,
      isCurrentUser,
      isCurrentUserTurn,
      isBidding,
      handleCardClick,
      pendingCard,
      viewportWidth,
    ]);

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
          showInlineAICard={
            !isCurrentUser && cards.length > 0 && viewportWidth <= 768
          }
          aiCardsCount={cards.length}
        />

        {!isCurrentUser && cards.length > 0 && viewportWidth > 768 && (
          <AICards cards={cards} />
        )}

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
