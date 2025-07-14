const express = require('express');
const router = express.Router();
const automationEngine = require('../services/automationEngine');

router.get('/rules', async (req, res) => {
  try {
    const rules = await automationEngine.getRules(req.user.id);
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rules', async (req, res) => {
  try {
    const rule = await automationEngine.createRule(req.user.id, req.body);
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/rules/:ruleId', async (req, res) => {
  try {
    const rule = await automationEngine.updateRule(req.params.ruleId, req.body);
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/rules/:ruleId', async (req, res) => {
  try {
    await automationEngine.deleteRule(req.params.ruleId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/scenes', async (req, res) => {
  try {
    const scenes = await automationEngine.getScenes(req.user.id);
    res.json(scenes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scenes/:sceneId/activate', async (req, res) => {
  try {
    const result = await automationEngine.activateScene(req.params.sceneId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;