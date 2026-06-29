import { io } from "socket.io-client";

// Single shared socket instance for the whole app.
// Connects lazily — call connectSocket() once you have a server URL.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io("http://192.168.1.5:5000", {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}