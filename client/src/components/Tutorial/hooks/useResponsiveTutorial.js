import { useState, useEffect, useCallback } from 'react';

export const useResponsiveTutorial = () => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth <= 768,
    isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: window.innerWidth > 1024
  });

  const updateScreenSize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setScreenSize({
      width,
      height,
      isMobile: width <= 768,
      isTablet: width > 768 && width <= 1024,
      isDesktop: width > 1024
    });
  }, []);

  useEffect(() => {
    let timeoutId;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScreenSize, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateScreenSize]);

  return screenSize;
};

export const getResponsiveTooltipSize = (screenSize) => {
  if (screenSize.isMobile) {
    return {
      width: Math.min(350, screenSize.width * 0.95),
      height: Math.min(250, screenSize.height * 0.6),
      padding: 12
    };
  } else if (screenSize.isTablet) {
    return {
      width: Math.min(400, screenSize.width * 0.8),
      height: Math.min(280, screenSize.height * 0.7),
      padding: 16
    };
  } else {
    return {
      width: Math.min(420, screenSize.width * 0.4),
      height: Math.min(300, screenSize.height * 0.8),
      padding: 20
    };
  }
};
