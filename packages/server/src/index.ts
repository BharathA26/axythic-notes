import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";
import { connectMongoDB } from "./config/mongodb.js";
import { buildContext } from "./middleware/auth.js";

dotenv.config();

async function start() {
  // ── 1. Connect to MongoDB ──────────────────────────────────────────────
  await connectMongoDB();

  // ── 2. Setup Express + Apollo ─────────────────────────────────────────
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    // Surface full errors in development
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
  });

  await server.start();

  // ── 3. GraphQL route with auth context ────────────────────────────────
  // chrome-extension://* is NOT a valid CORS wildcard — Chrome requires the
  // full extension origin.  Set EXTENSION_ID in .env (the 32-char ID shown
  // in chrome://extensions) and it will be added automatically.
  const allowedOrigins: string[] = ["http://localhost:3000"];
  if (process.env.EXTENSION_ID) {
    allowedOrigins.push(`chrome-extension://${process.env.EXTENSION_ID}`);
  }

  app.use(
    "/graphql",
    cors<cors.CorsRequest>({
      origin: allowedOrigins,
      credentials: true,
    }),
    express.json({ limit: "10mb" }),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // buildContext verifies Firebase JWT and returns { user }
        return buildContext(req as any);
      },
    }),
  );

  // ── 4. Health check ────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const PORT = process.env.PORT || 5002;
  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
    console.log(`❤️  Health check at  http://localhost:${PORT}/health`);
  });
}

start().catch(console.error);
