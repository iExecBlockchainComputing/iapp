import { readFile } from 'node:fs/promises';
import express from 'express';
import { WebSocketServer } from 'ws';
import { pino } from 'pino';
import {
  sconifyHttpHandler,
  sconifyWsHandler,
} from './sconify/sconify.handler.js';
import { logger, loggerMiddleware } from './utils/logger.js';
import { createRequestId, requestIdMiddleware } from './utils/requestId.js';
import { errorHandler, errorHandlerMiddleware } from './utils/errors.js';
import {
  bootstrapWsSession,
  deserializeData,
  sendWsMessage,
  useHeartbeat,
} from './utils/websocket.js';
import { bindSession } from './utils/requestContext.js';

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
const wss = new WebSocketServer({ noServer: true });
useHeartbeat(wss);
server.on('upgrade', (request, socket, head) => {
  createRequestId(() =>
    wss.handleUpgrade(
      request,
      socket,
      head,
      bootstrapWsSession(async (ws) => {
        wss.emit('connection', socket, request);
        ws.on(
          'message',
          bindSession((data) => {
            try {
              const message = deserializeData(data);
              if ((message.type === 'REQUEST', message.target)) {
                let requestHandler: Promise<object>;
                if (message.target === 'SCONIFY') {
                  requestHandler = sconifyWsHandler(message);
                }
                // Add other handler here
                if (requestHandler) {
                  requestHandler
                    // handle success
                    .then(async (result) => {
                      await sendWsMessage({
                        type: 'RESPONSE',
                        target: message.target,
                        success: true,
                        result,
                      });
                    })
                    // handle error
                    .catch((e) =>
                      errorHandler(e, async ({ code, error }) => {
                        await sendWsMessage({
                          type: 'RESPONSE',
                          target: message.target,
                          success: false,
                          code,
                          error,
                        });
                      })
                    );
                }
              }
            } catch (e) {
              logger.warn(e, 'error on WS message');
            }
          })
        );
      })
    )
  );
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
