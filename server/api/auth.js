const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword
    };
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.json({ token, userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const token = jwt.sign({ userId: '123' }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spotify/callback', async (req, res) => {
  try {
    res.redirect('/dashboard?spotify=connected');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;