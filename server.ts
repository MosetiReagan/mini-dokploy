import { createServer } from "http";
import { parse } from "url";
import next from "next";
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function startServer() {
  try {
    await app.prepare();

    // Initialize database schema and websocket services after Next.js isolate boots
    await import("./src/server/db");
    const { setupWebSocketServer } = await import("./src/server/websocket/server");

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
