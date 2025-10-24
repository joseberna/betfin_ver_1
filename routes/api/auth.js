'use strict';

const express = require('express');
const { body } = require('express-validator');
const validateToken = require('../../middleware/auth');
const { getCurrentUser, login } = require('../../controllers/auth');

const router = express.Router();

// GET /api/auth -> usuario actual
router.get('/', validateToken, getCurrentUser);

// POST /api/auth -> login
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

module.exports = router;
