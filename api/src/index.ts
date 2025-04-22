import { readFile } from 'node:fs/promises';
import express from 'express';
import { pino } from 'pino';
import {
  sconifyHttpHandler,
  sconifyWsHandler,
} from './sconify/sconify.handler.js';
import { loggerMiddleware } from './utils/logger.js';
import { requestIdMiddleware } from './utils/requestId.js';
import { errorHandlerMiddleware } from './utils/errors.js';
import { attachWebSocketServer } from './utils/websocket.js';
import {
  sconifyPrepareHttpHandler,
  sconifyPrepareWsHandler,
} from './sconify/sconifyPrepare.handler.js';

const app = express();
const hostname = '0.0.0.0';
const port = 3000;

const rootLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Read package.json to get the version
const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

app.use(express.json());
app.use(requestIdMiddleware);
app.use(loggerMiddleware);

app.post('/sconify', sconifyHttpHandler);
app.post('/sconify/prepare', sconifyPrepareHttpHandler);

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

app.use(errorHandlerMiddleware);

const server = app.listen(port, hostname, () => {
  rootLogger.info(`Server running at http://${hostname}:${port}/`);
});

// websocket
attachWebSocketServer({
  server,
  requestRouter: (requestTarget) => {
    if (requestTarget === 'SCONIFY') {
      return sconifyWsHandler;
    }
    if (requestTarget === 'SCONIFY_PREPARE') {
      return sconifyPrepareWsHandler;
    }
  },
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
