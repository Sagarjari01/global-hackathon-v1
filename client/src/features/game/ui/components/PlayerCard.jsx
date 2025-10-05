import React, { memo } from "react";
import styles from "../Game.module.css";
import { getSuitSymbol, getCardValue } from "../utils/cardUtils";

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
    const isPendingCard =
      pendingCard &&
      pendingCard.suit === card.suit &&
      pendingCard.value === card.value;
    const isDisabled = !isCurrentUserTurn || isBidding || !!pendingCard;

    // Calculate fan positioning and rotation
    const centerIndex = (totalCards - 1) / 2;
    const offsetFromCenter = index - centerIndex;
    const maxAngle = 6; // Reduced maximum rotation angle for better alignment
    const rotation =
      totalCards > 1
        ? (offsetFromCenter * maxAngle) / Math.max(1, Math.ceil(centerIndex))
        : 0;

    // Calculate spacing - keep all cards on same line
    const baseSpacing = cardWidth - overlap;
    return (
      <div
        key={`${card.suit}-${card.value}`}
        className={`${styles.fanCardUser} ${isRed ? styles.red : ""} 
        ${
          isCurrentUserTurn && !isBidding && !pendingCard
            ? styles.playableCard
            : ""
        }
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
          "--card-rotation": `${rotation}deg`,
        }}
        onClick={
          !isDisabled && onCardClick ? () => onCardClick(card) : undefined
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

export default PlayerCard;
