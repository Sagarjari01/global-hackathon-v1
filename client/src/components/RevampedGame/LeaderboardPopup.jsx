import React from 'react';
import styles from '../RevampedGame.module.css';

const LeaderboardPopup = ({ players, onNewGame }) => {
  // Sort players by score in descending order
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  // Get top 3 players (or fewer if there aren't 3 players)
  const topPlayers = sortedPlayers.slice(0, 3);
  
  // Trophy icons for each position
  const renderRankIcon = (index) => {
    if (index === 0) {
      return <div className={`${styles.rankTrophy} ${styles.firstTrophy}`}>🏆</div>;
    } else if (index === 1) {
      return <div className={`${styles.rankTrophy} ${styles.secondTrophy}`}>🥈</div>;
    } else if (index === 2) {
      return <div className={`${styles.rankTrophy} ${styles.thirdTrophy}`}>🥉</div>;
    }
    return <div className={styles.rank}>{index + 1}</div>;
  };
  
  // Get CSS class for each row based on position
  const getRowClass = (index) => {
    if (index === 0) return `${styles.leaderRow} ${styles.first}`;
    if (index === 1) return `${styles.leaderRow} ${styles.second}`;
    if (index === 2) return `${styles.leaderRow} ${styles.third}`;
    return styles.leaderRow;
  };
  
  return (
    <div className={styles.leaderboardPopup}>
      <h2 className={styles.leaderboardTitle}>Final Rankings</h2>
      
      <div className={styles.leadersList}>
        {topPlayers.map((player, index) => (
          <div key={player.id} className={getRowClass(index)}>
            <div className={styles.rank}>
              {renderRankIcon(index)}
            </div>
            <div className={styles.playerInfo}>
              <img 
                src={player.avatar} 
                alt={player.name} 
                className={styles.leaderAvatar} 
              />
              <div className={styles.leaderName}>{player.name}</div>
            </div>
            <div className={styles.leaderScore}>{player.score}</div>
          </div>
        ))}
      </div>
      
      <button className={styles.newGameButton} onClick={onNewGame}>
        Play Again
      </button>
    </div>
  );
};

export default LeaderboardPopup; 