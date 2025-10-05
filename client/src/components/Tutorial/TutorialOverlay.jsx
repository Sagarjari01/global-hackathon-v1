import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Tutorial.module.css';
import { useResponsiveTutorial } from './hooks/useResponsiveTutorial';

const TutorialOverlay = ({ 
  step, 
  currentStep, 
  totalSteps, 
  onNext, 
  onPrev, 
  onSkip, 
  highlight 
}) => {
  const [highlightedElement, setHighlightedElement] = useState(null);
  const overlayRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const screenSize = useResponsiveTutorial();

  // Handle window resize with debouncing
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      // The screenSize will be automatically updated by the useResponsiveTutorial hook
      // Force a re-render to update tooltip positioning
    }, 100);
  }, []);

  // Setup resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleResize]);

  // Find and highlight the target element with dynamic updates
  useEffect(() => {
    // Don't search for elements when no highlight specified
    if (!highlight) {
      setHighlightedElement(null);
      return;
    }

    const updateHighlightedElement = () => {
      // Map highlight identifiers to actual selectors - using attribute selectors for CSS modules
      const selectorMap = {
        'gameHeader': '[class*="gameHeader"]',
        'biddingControls': '[class*="biddingCenter"], [class*="biddingControls"]',
        'currentPlayer': '[class*="turnIndicator"], [class*="currentPlayer"]',
        'currentPlayerHand': '[data-tutorial="player-hand"], [class*="straightHand"], [class*="playerCards"]',
        'centerArea': '[data-tutorial="center-area"], [class*="centerArea"], [class*="playArea"], [class*="gameBoard"]',
        'trumpSuit': '[class*="trumpSuitBox"], [class*="trumpInfo"]',
        'playerStats': '[class*="playerStats"], [class*="playersInfo"]'
      };

      const selector = selectorMap[highlight];
      if (selector) {
        const selectors = selector.split(', ');
        let element = null;
        
        for (const sel of selectors) {
          element = document.querySelector(sel.trim());
          if (element) {
            // console.log(`Found element for ${highlight} with selector ${sel}:`, element);
            
            // Special handling for player hand to get better bounds
            if (highlight === 'currentPlayerHand') {
              // Try to get all player cards within the hand container
              const cards = element.querySelectorAll('[class*="fanCardUser"]');
              if (cards.length > 0) {
                // Calculate bounding box that encompasses all cards
                let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
                
                cards.forEach(card => {
                  const cardRect = card.getBoundingClientRect();
                  minLeft = Math.min(minLeft, cardRect.left);
                  minTop = Math.min(minTop, cardRect.top);
                  maxRight = Math.max(maxRight, cardRect.right);
                  maxBottom = Math.max(maxBottom, cardRect.bottom);
                });
                
                if (minLeft !== Infinity) {
                  // console.log('Using calculated card bounds:', { minLeft, minTop, maxRight, maxBottom });
                  const rect = {
                    top: minTop,
                    left: minLeft,
                    width: maxRight - minLeft,
                    height: maxBottom - minTop
                  };
                  setHighlightedElement(rect);
                  return;
                }
              }
            }
            
            // Special handling for center area to highlight played cards
            if (highlight === 'centerArea') {
              // Try to get all played cards within the center area
              const playedCards = element.querySelectorAll('[class*="card"][class*="played"]');
              if (playedCards.length > 0) {
                // Calculate bounding box that encompasses all played cards
                let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
                
                playedCards.forEach(card => {
                  const cardRect = card.getBoundingClientRect();
                  minLeft = Math.min(minLeft, cardRect.left);
                  minTop = Math.min(minTop, cardRect.top);
                  maxRight = Math.max(maxRight, cardRect.right);
                  maxBottom = Math.max(maxBottom, cardRect.bottom);
                });
                
                if (minLeft !== Infinity) {
                  // console.log('Using calculated center area bounds:', { minLeft, minTop, maxRight, maxBottom });
                  const rect = {
                    top: minTop - 10, // Add some padding
                    left: minLeft - 10,
                    width: maxRight - minLeft + 20,
                    height: maxBottom - minTop + 20
                  };
                  setHighlightedElement(rect);
                  return;
                }
              }
            }
            
            // console.log('Element rect:', element.getBoundingClientRect());
            break;
          }
        }
        
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightedElement({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        } else {
          // console.log(`No element found for ${highlight} with selector ${selector}`);
          setHighlightedElement(null);
        }
      }
    };

    // Initial update
    const timeout = setTimeout(updateHighlightedElement, 150);

    // Update on window resize or orientation change
    const resizeHandler = () => {
      setTimeout(updateHighlightedElement, 100);
    };

    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', resizeHandler);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('orientationchange', resizeHandler);
    };
  }, [highlight, currentStep, step.position]);

  // Calculate tooltip position with responsive screen bounds checking
  const getTooltipStyle = useCallback(() => {
    // When position is center but there's a highlighted element, position tooltip to avoid covering it
    if (step.position === 'center') {
      const tooltipWidth = Math.min(420, screenSize.width * 0.9);
      const tooltipHeight = Math.min(280, screenSize.height * 0.7);
      
      // If there's a highlighted element, try to position tooltip below or above it
      if (highlightedElement) {
        const padding = 20;
        const elementBottom = highlightedElement.top + highlightedElement.height;
        const elementTop = highlightedElement.top;
        
        // Try to position below the highlighted element first
        if (elementBottom + padding + tooltipHeight <= screenSize.height - padding) {
          return {
            top: elementBottom + padding + 'px',
            left: (screenSize.width / 2) - (tooltipWidth / 2) + 'px',
            maxWidth: tooltipWidth + 'px',
            maxHeight: tooltipHeight + 'px'
          };
        }
        // Try to position above the highlighted element
        else if (elementTop - padding - tooltipHeight >= padding) {
          return {
            top: elementTop - padding - tooltipHeight + 'px',
            left: (screenSize.width / 2) - (tooltipWidth / 2) + 'px',
            maxWidth: tooltipWidth + 'px',
            maxHeight: tooltipHeight + 'px'
          };
        }
      }
      
      // Default center positioning when no highlighted element or can't fit above/below
      return { 
        top: (screenSize.height / 2) - (tooltipHeight / 2) + 'px', 
        left: (screenSize.width / 2) - (tooltipWidth / 2) + 'px',
        maxWidth: tooltipWidth + 'px',
        maxHeight: tooltipHeight + 'px'
      };
    }
    
    if (!highlightedElement) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        maxWidth: Math.min(420, screenSize.width * 0.9) + 'px'
      };
    }

    const padding = Math.min(20, screenSize.width * 0.02);
    const tooltipWidth = Math.min(420, screenSize.width * 0.9);
    const tooltipHeight = Math.min(300, screenSize.height * 0.8);
    
    let top, left, transform = 'translate(0%, 0%)';
    let preferredPosition = step.position;

    // Helper function to check if position fits
    const checkFit = (testTop, testLeft) => {
      return testTop >= padding && 
             testTop + tooltipHeight <= screenSize.height - padding &&
             testLeft >= padding && 
             testLeft + tooltipWidth <= screenSize.width - padding;
    };

    // Calculate positions for all directions
    const positions = {
      top: {
        top: highlightedElement.top - tooltipHeight - padding,
        left: highlightedElement.left + highlightedElement.width / 2 - tooltipWidth / 2,
      },
      bottom: {
        top: highlightedElement.top + highlightedElement.height + padding,
        left: highlightedElement.left + highlightedElement.width / 2 - tooltipWidth / 2,
      },
      left: {
        top: highlightedElement.top + highlightedElement.height / 2 - tooltipHeight / 2,
        left: highlightedElement.left - tooltipWidth - padding,
      },
      right: {
        top: highlightedElement.top + highlightedElement.height / 2 - tooltipHeight / 2,
        left: highlightedElement.left + highlightedElement.width + padding,
      },
      center: {
        top: screenSize.height / 2 - tooltipHeight / 2,
        left: screenSize.width / 2 - tooltipWidth / 2,
      }
    };

    // Try preferred position first, then fallback to others
    const tryOrder = [preferredPosition, 'bottom', 'top', 'right', 'left', 'center'];
    
    for (const pos of tryOrder) {
      const position = positions[pos];
      if (pos === 'center' || checkFit(position.top, position.left)) {
        top = Math.max(padding, Math.min(screenSize.height - tooltipHeight - padding, position.top));
        left = Math.max(padding, Math.min(screenSize.width - tooltipWidth - padding, position.left));
        break;
      }
    }

    return { 
      top: top + 'px', 
      left: left + 'px', 
      transform,
      maxWidth: tooltipWidth + 'px',
      maxHeight: tooltipHeight + 'px'
    };
  }, [step.position, highlightedElement, screenSize]);

  return (
    <div className={styles.tutorialOverlay} ref={overlayRef}>
      {/* Blur overlay sections that avoid the highlighted area */}
      {highlightedElement ? (
        <>
          {/* Top section */}
          <div 
            className={styles.overlaySection}
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: Math.max(0, highlightedElement.top - 15)
            }}
          />
          
          {/* Left section */}
          <div 
            className={styles.overlaySection}
            style={{
              top: highlightedElement.top - 15,
              left: 0,
              width: Math.max(0, highlightedElement.left - 15),
              height: highlightedElement.height + 30
            }}
          />
          
          {/* Right section */}
          <div 
            className={styles.overlaySection}
            style={{
              top: highlightedElement.top - 15,
              left: highlightedElement.left + highlightedElement.width + 15,
              width: `calc(100% - ${highlightedElement.left + highlightedElement.width + 15}px)`,
              height: highlightedElement.height + 30
            }}
          />
          
          {/* Bottom section */}
          <div 
            className={styles.overlaySection}
            style={{
              top: highlightedElement.top + highlightedElement.height + 15,
              left: 0,
              width: '100%',
              height: `calc(100% - ${highlightedElement.top + highlightedElement.height + 15}px)`
            }}
          />
          
          {/* Spotlight border around highlighted element */}
          <div 
            className={styles.spotlight}
            style={{
              top: highlightedElement.top - 15,
              left: highlightedElement.left - 15,
              width: highlightedElement.width + 30,
              height: highlightedElement.height + 30,
            }}
          />
        </>
      ) : (
        /* Full overlay when no element is highlighted */
        <div className={styles.overlay} />
      )}

      {/* Tutorial tooltip */}
      <div 
        className={styles.tutorialTooltip}
        style={getTooltipStyle()}
      >
        <div className={styles.tooltipHeader}>
          <h3 className={styles.tooltipTitle}>{step.title}</h3>
          <div className={styles.stepIndicator}>
            {currentStep} / {totalSteps}
          </div>
        </div>
        
        <div className={styles.tooltipContent}>
          <p>{step.content}</p>
        </div>
        
        <div className={styles.tooltipActions}>
          <button 
            className={styles.skipButton}
            onClick={onSkip}
          >
            Skip Tutorial
          </button>
          
          <div className={styles.navigationButtons}>
            {currentStep > 1 && (
              <button 
                className={styles.prevButton}
                onClick={onPrev}
              >
                Previous
              </button>
            )}
            
            <button 
              className={styles.nextButton}
              onClick={onNext}
            >
              {currentStep === totalSteps ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Animated pointer to highlight element */}
      {highlightedElement && step.position !== 'center' && (
        <div 
          className={styles.pointer}
          style={{
            top: highlightedElement.top + highlightedElement.height / 2,
            left: highlightedElement.left + highlightedElement.width / 2,
          }}
        />
      )}
    </div>
  );
};

export default TutorialOverlay;
