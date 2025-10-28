// server/socket/auth.js
'use strict';

const jwt = require('jsonwebtoken');
const config = require('../server/config/config');

async function verify(socket) {
  // Permitir invitados en desarrollo
  if ((config.NODE_ENV || process.env.NODE_ENV) !== 'production') {
    console.log('[socketAuth] dev mode — skipping token validation');
    return true;
  }

  const token = socket.handshake?.auth?.token;
  if (!token) {
    throw new Error('missing token');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    socket.user = decoded; // opcional: adjunta info al socket
    return true;
  } catch (err) {
    console.error('[socketAuth] invalid token:', err.message);
    throw new Error('invalid token');
  }
}

module.exports = { verify };
