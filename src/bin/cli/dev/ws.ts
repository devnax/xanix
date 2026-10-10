import { WebSocketServer } from "ws";
import { startServer } from "./server.js";

const startWebSocketServer = () => {
  const WebSocketPort = 49152;
  const wss = new WebSocketServer({
    port: WebSocketPort,
  });

  let sockets = new Set<any>();
  const broadcast = (message: string) => {
    sockets.forEach((socket: any) => {
      if (socket.readyState === 1) {
        socket.send(message);
      }
    });
  };

  wss.on("connection", (ws) => {
    sockets.add(ws);
    ws.on("close", () => {
      sockets.delete(ws);
    });

    ws.on("message", (message) => {
      if (message.toString() === "reload") {
        startServer();
      }
    });
  });

  return broadcast;
};

export default startWebSocketServer;
