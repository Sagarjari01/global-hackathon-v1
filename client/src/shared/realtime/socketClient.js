import { io } from "socket.io-client";
import { ENV } from "../config/env";

class SocketClient {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(ENV.apiUrl);
    }
    return this.socket;
  }

  on(event, callback) {
    this.connect().on(event, callback);
    return () => this.socket?.off(event, callback);
  }

  emit(event, ...args) {
    this.connect().emit(event, ...args);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketClient = new SocketClient();
