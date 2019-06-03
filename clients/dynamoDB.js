const AWS = require('aws-sdk');
const TABLE_NAME = 'stupid-words';
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const dynamoWrapper = {
  get: word =>
    new Promise((resolve, reject) => {
      dynamoDB.get(
        {
          TableName: TABLE_NAME,
          Key: {
            word,
          },
        },
        (err, data) => {
          if (err) reject(err);
          resolve(data);
        },
      );
    }),

  put: (word, data) =>
    new Promise((resolve, reject) => {
      dynamoDB.put(
        {
          TableName: TABLE_NAME,
          Item: {
            word,
            ...data,
          },
        },
        (err, data) => {
          if (err) reject(err);
          resolve(data);
        },
      );
    }),

  updateSynonyms: (word, synonyms) =>
    new Promise((resolve, reject) => {
      dynamoDB.update(
        {
          TableName: TABLE_NAME,
          Key: {
            word,
          },
          UpdateExpression: 'set synonyms = :s',
          ExpressionAttributeValues: {
            ':s': synonyms,
          },
          ReturnValues: 'UPDATED_OLD',
        },
        (err, data) => {
          if (err) reject(err);
          resolve(data);
        },
      );
    }),

  updateSyllables: (word, syllables) =>
    new Promise((resolve, reject) => {
      dynamoDB.update(
        {
          TableName: TABLE_NAME,
          Key: {
            word,
          },
          UpdateExpression: 'set syllables = :s',
          ExpressionAttributeValues: {
            ':s': syllables,
          },
          ReturnValues: 'UPDATED_OLD',
        },
        (err, data) => {
          if (err) reject(err);
          resolve(data);
        },
      );
    }),
};

module.exports = { dynamoWrapper };
