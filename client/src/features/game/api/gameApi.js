import { http } from "../../../shared/api/httpClient";
import { ENDPOINTS } from "../../../constants/endpoints";

export const gameApi = {
  createGame(playerName, playerCount = 3, roundCount = 6) {
    return http.post(ENDPOINTS.CREATE_GAME, {
      playerName,
      playerCount,
      roundCount,
    });
  },
};
