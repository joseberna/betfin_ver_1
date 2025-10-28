// controllers/auth.js
'use strict';

const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// Utilidad: respuesta de error uniforme
function sendAuthError(res) {
  return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
}

// @route   GET /api/auth
// @desc    Get current user (by token)
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();

    if (!user) return res.status(404).json({ msg: 'User not found' });

    return res.status(200).json(user);
  } catch (err) {
    console.error('[auth.getCurrentUser]', err);
    return res.status(500).send('Internal server error');
  }
};

// @route   POST /api/auth
// @desc    Authenticate user & get token
// @access  Public
exports.login = async (req, res) => {
  // Validación de campos
  const errors = validationResult(req);
  if (!errors || !errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 1) Buscar usuario (necesitamos el hash)
    // Si en tu schema tienes `select: false` en password, usa '+password'
    const user = await User.findOne({ email }).select('+password');

    // 2) Comparar password en constante tiempo
    if (!user) return sendAuthError(res);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendAuthError(res);

    // 3) Construir payload JWT
    const payload = {
      user: { id: user._id.toString() },
    };

    const expiresIn = config.JWT_TOKEN_EXPIRES_IN || '1h';
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn });

    // 4) (Opcional) Enviar también como cookie httpOnly
    // Requiere tener CORS y cookie-parser configurados correctamente.
    if (config.JWT_SET_COOKIE === 'true') {
      const ms =
        typeof expiresIn === 'string' && expiresIn.endsWith('h')
          ? parseInt(expiresIn) * 60 * 60 * 1000
          : 60 * 60 * 1000; // fallback 1h

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.NODE_ENV !== 'development',
        sameSite: 'lax',
        maxAge: ms,
      });
    }

    // 5) Responder token y algunos datos mínimos del usuario
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        // agrega aquí lo que necesites exponer (nunca el password)
      },
    });
  } catch (err) {
    console.error('[auth.login]', err);
    return res.status(500).json({ msg: 'Internal server error' });
  }
};
