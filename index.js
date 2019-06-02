const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const wikipediaClient = require('./clients/wikipedia');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/random-text', async (req, res) => {
  try {
    const lang = req.query && req.query.lang;

    const randomTitle = await wikipediaClient.getRandomWikipediaArticle(lang);

    const results = await wikipediaClient.fetchSentenceFromWikipedia(
      lang,
      randomTitle,
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

module.exports.handler = serverless(app);
