import config from '../config/config';
import { ENDPOINTS } from '../constants/endpoints';

export const apiService = {
  createGame: async (playerName) => {
    const response = await fetch(`${config.apiUrl}${ENDPOINTS.CREATE_GAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName })
    });
    return response.json();
  },

  placeBid: async (gameId, bid) => {
    const response = await fetch(`${config.apiUrl}${ENDPOINTS.PLACE_BID(gameId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bid })
    });
    return response.json();
  },

  playCard: async (gameId, card) => {
    const response = await fetch(`${config.apiUrl}${ENDPOINTS.PLAY_CARD(gameId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card })
    });
    return response.json();
  }
};