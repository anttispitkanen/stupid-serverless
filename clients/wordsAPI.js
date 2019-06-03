const axios = require('axios');
const { dynamoWrapper } = require('./dynamoDB');
const { ignoredWords } = require('../ignoredWords');

const { RAPIDAPI_KEY, RAPIDAPI_HOST } = process.env;

function extractWords(text) {
  return text
    .split(/\W/)
    .filter(
      word =>
        !!word && /\D/.test(word) && !ignoredWords.includes(word.toLowerCase()),
    );
}

/**
 * Fetch synonyms for each word given
 * @param {Array<string>} wordArray
 */
async function createWordsWithSynonyms(wordArray) {
  const wordsWithSynonyms = [];
  await Promise.all(
    wordArray.map(async word => {
      const wordWithSynonyms = await getSynonymsForWord(word);
      return wordsWithSynonyms.push(wordWithSynonyms);
    }),
  );
  return wordsWithSynonyms;
}

/**
 * Get synonyms from DB if they exist there.
 * If not, fetch from wordsAPI and insert into DB.
 * @param {string} word
 */
async function getSynonymsForWord(word) {
  try {
    // Check DB and return from there if word and synonyms exist
    const maybeWord = await dynamoWrapper.get(word);
    console.log(maybeWord);

    if (maybeWord && maybeWord.Item && maybeWord.Item.synonyms) {
      return {
        word,
        synonyms: maybeWord.Item.synonyms,
      };
    }

    // not in DB, fetch from WordsAPI
    const synonyms = await fetchSynonymsFromAPI(word);

    // also store in DB
    await upsertWordWithSynonyms(word, synonyms, maybeWord);

    return {
      word,
      synonyms,
    };
  } catch (err) {
    console.error(err);
    return {
      word,
      synonyms: [],
    };
  }
}

async function fetchSynonymsFromAPI(word) {
  try {
    const response = await axios.get(
      `https://wordsapiv1.p.rapidapi.com/words/${encodeURIComponent(
        word,
      )}/synonyms`,
      {
        headers: {
          'x-RapidAPI-Host': RAPIDAPI_HOST,
          'x-RapidAPI-Key': RAPIDAPI_KEY,
        },
      },
    );

    const { data } = response;
    const synonyms = data.synonyms;
    return synonyms;
  } catch (err) {
    console.error(`${word} not found`);
    return [];
  }
}

async function upsertWordWithSynonyms(word, synonyms, wordExists = false) {
  if (wordExists) {
    return dynamoWrapper.updateSynonyms(word, synonyms);
  }
  return dynamoWrapper.put(word, { synonyms });
}

async function getSynonymsForText(text) {
  const words = extractWords(text);
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
  const wordsWithSynonyms = await createWordsWithSynonyms(uniqueWords);
  return wordsWithSynonyms;
}

module.exports = {
  getSynonymsForText,
};
