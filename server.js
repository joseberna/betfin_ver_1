/* server.js
 * Express + Socket.IO v4
 * Buenas prácticas: .env temprano, validación de config, CORS socket, healthcheck,
 * manejo de errores, graceful shutdown, logs y separación HTTP/WS.
 */

'use strict';

// 1) Cargar .env ANTES de leer config
require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');

// 2) Config centralizada
const config = require('./config'); // Asegúrate que exporta { PORT, NODE_ENV, CLIENT_ORIGIN, AUTH_API_KEY, ... }

// 3) Middlewares y rutas de tu proyecto
const configureMiddleware = require('./middleware');
const configureRoutes = require('./routes');

// 4) Socket.IO v4
const { Server: IOServer } = require('socket.io');
const gameSocket = require('./socket');

// 5) (Opcional) DB
// const connectDB = require('./config/db');

//
// ---- Validaciones mínimas de configuración ----
//
const requiredEnv = ['PORT', 'NODE_ENV']; // agrega claves obligatorias: 'AUTH_API_KEY', etc.
for (const key of requiredEnv) {
    if (!config[key]) {
        // No detenemos en dev, pero avisamos fuerte
        console.warn(`[config] Missing ${key}. Using fallback/default if provided.`);
    }
}

//
// ---- Inicialización Express ----
const app = express();

// Confía en cabeceras proxy si vas detrás de Nginx/ALB
app.set('trust proxy', 1);

// Middlewares (body parsers, security headers, rate limit, etc.)
configureMiddleware(app);

// Healthchecks y ready checks
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), env: config.NODE_ENV });
});
app.get('/ready', (_req, res) => {
    // aquí podrías validar conexión DB/colas/etc.
    res.status(200).json({ ready: true });
});

// Rutas de la app (versionadas dentro, p.ej. /api/v1)
configureRoutes(app);

// (Opcional) servir estáticos (si build del front vive aquí)
// app.use(express.static(path.join(__dirname, 'client', 'build')));
// app.get('*', (_req, res) => {
//   res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
// });

//
// ---- Servidor HTTP + Socket.IO ----
const httpServer = http.createServer(app);

// CORS para WebSocket (ajusta origin a tu front real)
const io = new IOServer(httpServer, {
    cors: {
        origin: [config.CLIENT_ORIGIN, 'http://localhost:3000', 'http://192.168.1.15:3000', '*'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    // transports: ['websocket'], // Si quieres forzar solo WS y evitar polling
});

io.on('connection', (socket) => {
    // Centraliza toda la lógica de rooms/juego en /socket/index.js
    try {
        console.log(`[socket.io] client connected: ${socket.id}`);
        gameSocket.init(socket, io);
    } catch (e) {
        console.error('[socket] error during init:', e);
        socket.disconnect(true);
    }
});

//
// ---- Arranque del servidor ----
const PORT = Number(config.PORT) || 7777;

let serverUp = false;
httpServer.listen(PORT, () => {
    serverUp = true;
    console.log(
        `[server] Listening on port ${PORT} — env: ${config.NODE_ENV || 'development'}`
    );
});

// (Opcional) conectar DB al final del bootstrap
// (async () => {
//   try {
//     await connectDB();
//     console.log('[db] connected');
//   } catch (err) {
//     console.error('[db] connection error:', err);
//     process.exit(1);
//   }
// })();

//
// ---- Manejo de errores global ----
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
    // Cierra WS primero para dejar de aceptar tráfico en sockets
    try {
        io.close();
    } catch (_) { }

    if (serverUp) {
        httpServer.close(() => {
            console.log('[server] closed');
            // Cierra DB si aplica
            // db?.disconnect?.();
            process.exit(code);
        });

        // Failsafe: si algo cuelga, salimos en 5s
        setTimeout(() => {
            console.warn('[server] forced shutdown');
            process.exit(code);
        }, 5000).unref();
    } else {
        process.exit(code);
    }
}
