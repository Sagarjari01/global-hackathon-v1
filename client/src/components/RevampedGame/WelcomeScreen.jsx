import React, { useState, useEffect, useCallback } from 'react';
import styles from '../RevampedWelcome.module.css';

const WelcomeScreen = ({ onStartGame, onStartTutorial }) => {
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState(3);
  const [roundCount, setRoundCount] = useState(6);
  const [isNameValid, setIsNameValid] = useState(true);
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || ('ontouchstart' in window));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate the maximum number of rounds based on player count
  useEffect(() => {
    const maxRounds = Math.floor(((52 / playerCount) * 2) - 1);
    setRoundCount(prev => Math.min(prev, maxRounds));
  }, [playerCount]);

  // Get min and max round counts
  const getMinRounds = useCallback(() => 6, []);
  const getMaxRounds = useCallback(() => Math.floor(((52 / playerCount) * 2) - 1), [playerCount]);

  const handleNameChange = (e) => {
    const value = e.target.value;
    setPlayerName(value);
    setIsNameValid(value.trim().length > 0);
    if (value.trim().length > 0) {
      setShowValidationMessage(false);
    }
  };

  const handleStartGame = async () => {
    if (playerName.trim() === '') {
      setIsNameValid(false);
      setShowValidationMessage(true);
      return;
    }

    setIsLoading(true);
    try {
      await onStartGame(playerName, playerCount, roundCount);
    } catch (error) {
      console.error('Failed to start game:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleStartGame();
    }
  };

  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.cardBackground}></div>
      
      <div className={styles.welcomeContent}>
        <div className={styles.logoContainer}>
          <div className={styles.gameLogo}>
            <span className={styles.logoIcon}>♠</span>
            <span className={styles.logoIcon}>♥</span>
            <span className={styles.logoIcon}>♣</span>
            <span className={styles.logoIcon}>♦</span>
          </div>
          <h1 className={styles.gameTitle}>Judgment Card Game</h1>
        </div>
        
        <div className={styles.formContainer} onKeyDown={handleKeyDown}>
          <div className={styles.inputGroup}>
            <label htmlFor="playerName" className={styles.inputLabel}>Your Name</label>
            <input
              id="playerName"
              type="text"
              className={`${styles.textInput} ${!isNameValid ? styles.inputError : ''}`}
              value={playerName}
              onChange={handleNameChange}
              placeholder="Enter your name"
              autoComplete="off"
              autoFocus={!isMobile}
            />
            {showValidationMessage && !isNameValid && (
              <div className={styles.errorMessage}>Please enter your name</div>
            )}
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="playerCount" className={styles.inputLabel}>Number of Players</label>
            <div className={styles.rangeContainer}>
              <input
                id="playerCount"
                type="range"
                min="3"
                max="8"
                value={playerCount}
                onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                className={styles.rangeInput}
                step="1"
              />
              <div className={styles.rangeLabels}>
                {Array.from({length: 6}, (_, i) => i + 3).map(num => (
                  <span key={num}>{num}</span>
                ))}
              </div>
              <div className={styles.selectedValue}>
                {playerCount} Players
              </div>
            </div>
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="roundCount" className={styles.inputLabel}>Number of Rounds</label>
            <div className={styles.rangeContainer}>
              <input
                id="roundCount"
                type="range"
                min={getMinRounds()}
                max={getMaxRounds()}
                value={roundCount}
                onChange={(e) => setRoundCount(parseInt(e.target.value))}
                className={styles.rangeInput}
                step="1"
              />
              <div className={styles.rangeLabels}>
                <span>{getMinRounds()}</span>
                <span>{Math.floor((getMinRounds() + getMaxRounds()) / 2)}</span>
                <span>{getMaxRounds()}</span>
              </div>
              <div className={styles.selectedValue}>
                {roundCount} Rounds
              </div>
            </div>
          </div>
          
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.startButton} ${isLoading ? styles.loading : ''}`}
              onClick={handleStartGame}
              type="button"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner}></div>
                  <span>Creating Game...</span>
                </div>
              ) : (
                <>
                  <span className={styles.buttonIcon}>♠</span>
                  Start Game
                </>
              )}
            </button>
            
            <button 
              className={styles.tutorialButton}
              onClick={onStartTutorial}
              type="button"
              disabled={isLoading}
            >
              <span className={styles.buttonIcon}>🎓</span>
              Learn How to Play
            </button>
          </div>
        </div>
      </div>
      
      <div className={styles.welcomeFooter}>
        <p>Deal your cards, make your bid, and test your judgment!</p>
      </div>
    </div>
  );
};

export default WelcomeScreen; 