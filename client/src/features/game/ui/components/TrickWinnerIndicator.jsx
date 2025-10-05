import React, { memo } from "react";
import styles from "../Game.module.css";

const TrickWinnerIndicator = memo(() => (
  <div className={styles.trickWinnerIndicator}>
    <span className={styles.trickWinnerIcon}>🏆</span>
    <span>Trick</span>
  </div>
));

export default TrickWinnerIndicator;
