import React, { useEffect, useState } from 'react';
import styles from '../RevampedGame.module.css';

const ToastNotification = ({ message, onClose, autoHideDuration = 6000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-hide the toast after the specified duration
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) {
        setTimeout(onClose, 500); // Give time for the fadeout animation
      }
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [onClose, autoHideDuration]);

  if (!visible) return null;

  // For round completion messages
  if (message.type === 'roundComplete') {
    return (
      <div className={styles.toastContainer}>
        <div className={styles.roundToast}>
          <div className={styles.toastTitle}>{message.title}</div>
          <div className={styles.toastDivider}></div>
          <div className={styles.toastMessage}>
            {message.playerName} scored <span className={styles.toastPoints}>+{message.points}</span> points
          </div>
        </div>
      </div>
    );
  }
  
  // For trick winner messages
  if (message.type === 'trickWinner') {
    return (
      <div className={styles.toastContainer}>
        <div className={styles.roundToast}>
          {message.avatar && (
            <>
              <img 
                src={message.avatar} 
                alt={message.playerName} 
                className={styles.toastAvatar} 
              />
              <div className={styles.toastDivider}></div>
            </>
          )}
          <div className={styles.toastTitle}>{message.playerName}</div>
          <div className={styles.toastDivider}></div>
          <div className={styles.toastMessage}>takes the trick!</div>
        </div>
      </div>
    );
  }

  // Default toast
  return (
    <div className={styles.toastContainer}>
      <div className={styles.roundToast}>
        <div className={styles.toastMessage}>{message.text || message}</div>
      </div>
    </div>
  );
};

export default ToastNotification; 