
'use strict';
const express = require('express');
const { SiweMessage } = require('siwe');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const router = express.Router();

// almacén simple de nonces en memoria (prod => redis/db)
const nonces = new Map();

router.get('/nonce', (req, res) => {
  const nonce = (Math.random() + 1).toString(36).substring(2, 10);
  nonces.set(nonce, Date.now());
  res.json({ nonce });
});

router.post('/verify', express.json(), async (req, res) => {
  try {
    const { message, signature } = req.body;
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });

    // Validaciones mínimas
    if (fields.data.domain !== config.APP_DOMAIN) {
      return res.status(400).json({ ok: false, error: 'Invalid domain' });
    }
    if (!nonces.has(fields.data.nonce)) {
      return res.status(400).json({ ok: false, error: 'Invalid nonce' });
    }
    nonces.delete(fields.data.nonce);

    const address = fields.data.address.toLowerCase();
    const token = jwt.sign({ address }, config.JWT_SECRET, {
      expiresIn: config.JWT_TOKEN_EXPIRES_IN,
    });

    res.json({ ok: true, token, address });
  } catch (err) {
    console.error('[siwe.verify]', err);
    res.status(400).json({ ok: false, error: 'Verification failed' });
  }
});

module.exports = router;
