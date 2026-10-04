import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { setupWebSocketServer } from "./src/server/websocket/server";
import "./src/server/db"; // ensure database and schema DDL are initialized

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function startServer() {
  try {
    await app.prepare();

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error occurred handling", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    // Attach WebSocket log streamer to HTTP server
    setupWebSocketServer(server);

    server.listen(port, () => {
      console.log(`> Mini-Dokploy ready on http://${hostname}:${port}`);
      console.log(`> WebSocket log streamer active on ws://${hostname}:${port}/ws`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
