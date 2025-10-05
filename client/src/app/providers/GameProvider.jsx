import React from 'react';
import { GameProvider as GameStateProvider } from '../../features/game/model/gameStore';

export default function GameProvider({ children }) {
  return <GameStateProvider>{children}</GameStateProvider>;
}


