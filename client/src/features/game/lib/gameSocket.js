import { socketClient } from "../../../shared/realtime/socketClient";
import { SOCKET_EVENTS } from "../../../constants/endpoints";

export const gameSocket = {
  joinGame(gameId) {
    socketClient.emit(SOCKET_EVENTS.JOIN_GAME, gameId);
  },
  placeBid(gameId, bid) {
    socketClient.emit(SOCKET_EVENTS.PLACE_BID, gameId, bid);
  },
  playCard(gameId, card) {
    socketClient.emit(SOCKET_EVENTS.PLAY_CARD, gameId, card);
  },
  onGameState(cb) {
    return socketClient.on(SOCKET_EVENTS.GAME_STATE, cb);
  },
  onTrickComplete(cb) {
    return socketClient.on(SOCKET_EVENTS.TRICK_COMPLETE, cb);
  },
  onRoundComplete(cb) {
    return socketClient.on(SOCKET_EVENTS.ROUND_COMPLETE, cb);
  },
  onGameFinished(cb) {
    return socketClient.on(SOCKET_EVENTS.GAME_FINISHED, cb);
  },
  onError(cb) {
    return socketClient.on(SOCKET_EVENTS.ERROR, cb);
  },
  disconnect() {
    socketClient.disconnect();
  },
};
