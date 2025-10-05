import React, { memo } from "react";
import styles from "../Game.module.css";
import { formatBid, formatTricks } from "../utils/cardUtils";

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
    showInlineAICard = false,
    aiCardsCount = 0,
  }) => (
    <div
      className={`${styles.playerInfoBox} ${
        additionalClasses.playerInfoBox || ""
      } ${isCurrentUser ? styles.currentUserInfoBox : ""}`}
    >
      <div className={styles.playerIdentity}>
        <div className={styles.identityTopRow}>
          <div className={styles.avatarContainer}>
            <img
              src={avatar}
              alt={name}
              className={`${styles.avatar} ${additionalClasses.avatar || ""} ${
                isCurrentTurn ? styles.activeAvatar : ""
              }`}
            />
            {isCurrentTurn && <div className={styles.currentTurnRing}></div>}
            <div className={styles.scoreBadge} aria-hidden="true">
              {score}
            </div>
          </div>
          {showInlineAICard && (
            <div className={styles.aiInlineCardContainer} aria-hidden="true">
              <div className={`${styles.aiCardSingle} ${styles.aiInlineCard}`}>
                <div className={styles.aiCardSinglePattern} />
                <div className={styles.aiCardCounter}>{aiCardsCount}</div>
              </div>
            </div>
          )}
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
          <div className={styles.statLabel}>TRICK</div>
          <div className={styles.statValue + " " + styles.trickValue}>
            {formatTricks(tricks)}
          </div>
        </div>
      </div>
    </div>
  )
);

export default PlayerInfoBox;
