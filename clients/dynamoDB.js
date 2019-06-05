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

  update: (word, updateWhat, data) =>
    new Promise((resolve, reject) => {
      dynamoDB.update(
        {
          TableName: TABLE_NAME,
          Key: {
            word,
          },
          UpdateExpression: `set ${updateWhat} = :s`,
          ExpressionAttributeValues: {
            ':s': data,
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
