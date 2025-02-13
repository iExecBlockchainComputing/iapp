import express from 'express';
import http from 'node:http';
import { readFile } from 'fs/promises';
import pino from 'pino';
import { sconifyHandler, sconifyWsHandler } from './sconify/sconify.handler.js';
import { loggerMiddleware } from './utils/logger.js';
import { requestIdMiddleware } from './utils/requestId.js';
import { errorHandlerMiddleware } from './utils/errors.js';
import { WebSocketServer } from 'ws';

const hostname = '0.0.0.0';
const port = 3000;

const app = express();
const server = http.createServer(app);

const rootLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Read package.json to get the version
const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url))
);

app.use(express.json());
app.use(requestIdMiddleware);
app.use(loggerMiddleware);

app.post('/sconify', sconifyHandler);

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    version: packageJson.version,
    status: 'up',
  });
});

app.get('/', (req, res) => {
  res.status(200).send('Hello from iExec iApp API 👋');
});

// websocket endpoint
const wss = new WebSocketServer({ server, path: '/ws/sconify' });
wss.on('connection', (ws) => {
  sconifyWsHandler(ws);
});

app.use(errorHandlerMiddleware);

server.listen(port, hostname, () => {
  rootLogger.info(`Server running at http://${hostname}:${port}/`);
});

process.on('uncaughtException', (err) => {
  rootLogger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  rootLogger.error({ err }, 'Unhandled Rejection');
});

process.on('exit', (exitCode) => {
  rootLogger.info({ exitCode }, 'Exit');
});
