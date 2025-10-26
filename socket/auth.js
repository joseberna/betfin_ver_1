
'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = (io) => {
  io.use((socket, next) => {
    // En desarrollo, acepta todo
    if (config.NODE_ENV === 'development' || config.NODE_ENV === 'dev') {
      console.log('[socketAuth] modo desarrollo, omitiendo validación de token');
      return next();
    }

    const token = socket.handshake.auth?.token;
    if (!token) {
      console.warn('[socketAuth] missing token');
      return next(new Error('missing token'));
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      console.error('[socketAuth] invalid token', err.message);
      return next(new Error('invalid token'));
    }
  });
};
