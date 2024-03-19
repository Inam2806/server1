// serverlessFunction.js

const express = require('express');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello from the serverless function!' });
});

app.use('/.netlify/functions/server', router); // Base path for serverless functions

module.exports = app;
module.exports.handler = serverless(app);
