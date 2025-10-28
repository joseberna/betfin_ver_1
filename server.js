/* server.js
 * Express + Socket.IO v4 con namespaces para Lobby / Poker / Blackjack.
 * Buenas prácticas: .env temprano, CORS explícito, security headers,
 * health/ready, middleware de auth por namespace, graceful shutdown.
 */

'use strict';


require('dotenv').config();

const http = require('http');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');


const config = require('./server/config/config'); 


const configureMiddleware = require('./server/middleware');
const configureRoutes = require('./server/routes');
const siweRoutes = require('./server/routes/siwe');


const { Server: IOServer } = require('socket.io');


const socketAuth = require('./socket/auth');           // verify(socket) puede ser noop en dev
const lobbySocket = require('./socket/lobby');         // { init(socket, ns) { ... } }
const pokerSocket = require('./socket/poker');         // idem
const blackjackSocket = require('./socket/blackjack'); // idem

// ---- Validación suave de configuración
['PORT', 'NODE_ENV'].forEach((k) => {
  if (!config?.[k]) console.warn(`[config] Missing ${k}. Using fallback if any.`);
});

// ---- App HTTP
const app = express();
app.set('trust proxy', 1);


app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());

// logging dev/prod
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'development'));

configureMiddleware(app);

// health / ready
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'ok', uptime: process.uptime(), env: config.NODE_ENV })
);
app.get('/ready', (_req, res) =>
  res.status(200).json({ ready: true })
);

// rutas REST
app.use('/api/siwe', siweRoutes);
configureRoutes(app);


// ---- HTTP + Socket.IO
const httpServer = http.createServer(app);

const origins = (config.CLIENT_ORIGIN
  ? Array.isArray(config.CLIENT_ORIGIN)
    ? config.CLIENT_ORIGIN
    : String(config.CLIENT_ORIGIN).split(',').map(s => s.trim())
  : []
).filter(Boolean);

const io = new IOServer(httpServer, {
  cors: {
    origin: [
      ...origins,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // transports: ['websocket'], // habilítalo si quieres WS puro
  allowEIO3: false,
});

// Helper para registrar namespaces con auth + init
function registerNamespace(path, handler) {
  const ns = io.of(path);


  ns.use(async (socket, next) => {
    try {
      if (socketAuth?.verify) await socketAuth.verify(socket);
      return next();
    } catch (err) {
      console.warn(`[socket][${path}] auth failed:`, err?.message || err);
      return next(err);
    }
  });

  ns.on('connection', (socket) => {
    try {
      console.log(`[socket][${path}] connected: ${socket.id}`);
      // el handler debe registrar sus listeners de eventos
      if (typeof handler?.init !== 'function') {
        console.error(`[socket][${path}] handler.init not found`);
        socket.disconnect(true);
        return;
      }
      handler.init(socket, ns);
    } catch (e) {
      console.error(`[socket][${path}] init error:`, e);
      socket.disconnect(true);
    }
  });

  // Log de errores a nivel namespace (útil en prod)
  ns.server.engine.on('connection_error', (err) => {
    console.warn(`[socket][${path}] engine error:`, err?.code, err?.message);
  });

  return ns;
}

// Namespaces de la app
const lobbyNS = registerNamespace('/lobby', lobbySocket);
const pokerNS = registerNamespace('/poker', pokerSocket);
const blackjackNS = registerNamespace('/blackjack', blackjackSocket);


io.on('connection', (s) => {
  console.log('[socket][/] unexpected root connection, disconnecting');
  s.disconnect(true);
});

// ---- Arranque
const PORT = Number(config.PORT) || 7777;
let serverUp = false;

httpServer.listen(PORT, () => {
  serverUp = true;
  console.log(`[server] Listening on ${PORT} — env: ${config.NODE_ENV || 'development'}`);
});

// ---- Errores / shutdown ordenado
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  shutdown(1);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  shutdown(1);
});
process.on('SIGINT', () => {
  console.log('[signal] SIGINT');
  shutdown(0);
});
process.on('SIGTERM', () => {
  console.log('[signal] SIGTERM');
  shutdown(0);
});

function shutdown(code) {
  try {
    lobbyNS?.disconnectSockets?.(true);
    pokerNS?.disconnectSockets?.(true);
    blackjackNS?.disconnectSockets?.(true);
    io.close();
  } catch (_) {}

  if (serverUp) {
    httpServer.close(() => {
      console.log('[server] closed');
      process.exit(code);
    });
    setTimeout(() => {
      console.warn('[server] forced shutdown');
      process.exit(code);
    }, 5000).unref();
  } else {
    process.exit(code);
  }
}
