import React, { memo } from "react";
import styles from "../Game.module.css";
import useViewportWidth from "../hooks/useViewportWidth";

const AICards = memo(({ cards }) => {
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth <= 576;

  if (isMobile) {
    // Mobile: single card with a small counter badge
    return (
      <div className={styles.fanHandAI}>
        <div
          className={styles.aiCardSingle}
          aria-label={`AI has ${cards.length} cards`}
        >
          <div className={styles.aiCardSinglePattern} />
          <div className={styles.aiCardCounter}>{cards.length}</div>
        </div>
      </div>
    );
  }

  // Desktop/tablet: keep fanned back cards
  return (
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
  );
});

export default AICards;
