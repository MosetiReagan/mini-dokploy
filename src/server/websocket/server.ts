import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { parse } from "url";
import { logService, LogEntry } from "../services/log.service";

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Map of deploymentId -> Set of active WebSockets
  const subscriptions = new Map<string, Set<WebSocket>>();

  // Handle HTTP upgrade to WebSocket
  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname, query } = parse(request.url || "", true);

    if (pathname === "/ws" || pathname === "/ws/logs") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  // Listen for logs emitted by BuildService / DockerService
  logService.on("log", (entry: LogEntry) => {
    const clients = subscriptions.get(entry.deploymentId);
    if (clients && clients.size > 0) {
      const payload = JSON.stringify({ type: "log", data: entry });
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    }
  });

  wss.on("connection", (ws: WebSocket, request) => {
    const { query } = parse(request.url || "", true);
    let subscribedDeploymentId: string | null = (query.deploymentId as string) || null;

    if (subscribedDeploymentId) {
      addSubscription(subscribedDeploymentId, ws);
    }

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "subscribe" && msg.deploymentId) {
          if (subscribedDeploymentId) {
            removeSubscription(subscribedDeploymentId, ws);
          }
          subscribedDeploymentId = msg.deploymentId;
          addSubscription(subscribedDeploymentId, ws);
          ws.send(JSON.stringify({ type: "subscribed", deploymentId: subscribedDeploymentId }));
        }
      } catch (err) {
        // ignore malformed frame
      }
    });

    ws.on("close", () => {
      if (subscribedDeploymentId) {
        removeSubscription(subscribedDeploymentId, ws);
      }
    });

    ws.on("error", (err) => {
      console.warn("[WebSocket] Client socket error:", err.message);
    });
  });

  function addSubscription(deploymentId: string, ws: WebSocket) {
    let set = subscriptions.get(deploymentId);
    if (!set) {
      set = new Set();
      subscriptions.set(deploymentId, set);
    }
    set.add(ws);
  }

  function removeSubscription(deploymentId: string, ws: WebSocket) {
    const set = subscriptions.get(deploymentId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) subscriptions.delete(deploymentId);
    }
  }

  return wss;
}
