import React, { useState, useEffect, useRef, useCallback } from 'react';
import bgmFile from '../assets/BGM.mp3';
import styles from './AudioPlayer.module.css';

const AudioPlayer = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Initialize audio on mount
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = 0.3; // Set volume to 30%
    audio.loop = true; // Enable looping
    
    // Try to play - may be blocked by browser autoplay policy
    const attemptAutoplay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        // console.log('Autoplay prevented by browser. User interaction needed.');
        setIsPlaying(false);
      }
    };
    
    attemptAutoplay();
    
    // Add event listener for when document gets user interaction
    const handleUserInteraction = () => {
      if (!isPlaying && audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            // Remove event listeners once we've successfully started playing
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
            document.removeEventListener('keydown', handleUserInteraction);
          })
          .catch(err => console.error('Failed to play after user interaction:', err));
      }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Cleanup on unmount
    return () => {
      audio.pause();
      audio.currentTime = 0;
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isPlaying]);
  
  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !audio.muted;
      setIsMuted(!isMuted);
      
      // If we're unmuting and audio wasn't playing, try to play it
      if (!isMuted && !isPlaying) {
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error('Failed to play on unmute:', err));
      }
    }
  }, [isMuted, isPlaying]);

  return (
    <div className={styles.audioPlayer}>
      <audio ref={audioRef} src={bgmFile} preload="auto" />
      <button 
        className={styles.muteButton} 
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
        title={isMuted ? 'Unmute background music' : 'Mute background music'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};

export default AudioPlayer; 