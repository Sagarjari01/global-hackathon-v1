import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { gameSocket } from '../lib/gameSocket';

const GameStateContext = createContext(null);
const GameDispatchContext = createContext(() => {});

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, null);

  useEffect(() => {
    const off = gameSocket.onGameState((gs) => dispatch({ type: 'SET_STATE', payload: gs }));
    return () => off?.();
  }, []);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

export const useGameState = () => useContext(GameStateContext);
export const useGameDispatch = () => useContext(GameDispatchContext);


