const axios = require('axios');
const { dynamoWrapper } = require('./dynamoDB');
const { ignoredWords } = require('../ignoredWords');

const { RAPIDAPI_KEY, RAPIDAPI_HOST } = process.env;

const HEADERS = {
  'x-RapidAPI-Host': RAPIDAPI_HOST,
  'x-RapidAPI-Key': RAPIDAPI_KEY,
};

/**
 * @param {string} text
 * @returns {string[]}
 */
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
 * @param {string[]} wordArray
 * @param {"synonyms" | "syllables"} whatStuff
 */
async function createWordsWithStuff(wordArray, whatStuff) {
  /** @type {wordWithStuff[]} */
  const wordsWithStuff = [];

  await Promise.all(
    wordArray.map(async word => {
      const wordWithStuff = await getStuffForWord(word, whatStuff);
      return wordsWithStuff.push(wordWithStuff);
    }),
  );

  return wordsWithStuff;
}

/**
 * @typedef {Object} wordWithStuff
 * @property {string} word
 * @property {string[]} synonyms
 * @property {string[]} syllables
 */

/**
 * Get stuff from DB if it exists there, or from API if not,
 * and in such case also store in DB.
 * @param {string} word
 * @param {"synonyms" | "syllables"} whatStuff
 * @returns {Promise<wordWithStuff>}
 */
async function getStuffForWord(word, whatStuff) {
  try {
    // check if word exists in DB
    const maybeWord = await dynamoWrapper.get(word);
    console.log({ maybeWord });

    if (maybeWord && maybeWord.Item && maybeWord.Item[whatStuff]) {
      console.log('FOUND IN DB! :DD with value ' + maybeWord.Item[whatStuff]);
      // found in DB, just return the stuff
      return {
        word,
        [whatStuff]: maybeWord.Item[whatStuff],
      };
    }

    console.log('about to fetch stuff');
    // not in DB, fetch from API
    const stuff = await fetchStuffFromAPI(word, whatStuff);

    console.log({ stuff });
    // store in DB
    await upsertWordWithStuff(word, whatStuff, stuff, !!maybeWord);

    return {
      word,
      [whatStuff]: stuff,
    };
  } catch (err) {
    console.error(err);
    return {
      word,
      [whatStuff]: [],
    };
  }
}

/**
 * @param {string} word
 * @param {"synonyms" | "syllables"} whatToFetch
 * @returns {string[]}
 */
async function fetchStuffFromAPI(word, whatToFetch) {
  try {
    const response = await axios.get(
      `https://wordsapiv1.p.rapidapi.com/words/${encodeURIComponent(
        word,
      )}/${whatToFetch}`,
      {
        headers: HEADERS,
      },
    );

    const { data } = response;

    switch (whatToFetch) {
      case 'synonyms':
        const synonyms = data.synonyms;
        return synonyms || [];
      case 'syllables':
        const syllables = data && data.syllables && data.syllables.list;
        return syllables || [];
      default:
        return [];
    }
  } catch (err) {
    console.error(`${word} not found`);
    return [];
  }
}

/**
 * @param {string} word
 * @param {"synonyms" | "syllables"} whatToUpdate
 * @param {string[]} data
 * @param {boolean} wordExists
 */
async function upsertWordWithStuff(
  word,
  whatToUpdate,
  data,
  wordExists = false,
) {
  if (wordExists) {
    return dynamoWrapper.update(word, whatToUpdate, data);
  }
  return dynamoWrapper.put(word, { [whatToUpdate]: data });
}

/**
 * @param {string} text
 * @param {"synonyms" | "syllables"} whatStuff
 * @returns {wordWithStuff}
 */
async function getStuffForText(text, whatStuff) {
  const words = extractWords(text);
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
  const wordsWithSynonyms = await createWordsWithStuff(uniqueWords, whatStuff);
  return wordsWithSynonyms;
}

module.exports = {
  getStuffForText,
};
