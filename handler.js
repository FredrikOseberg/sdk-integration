'use strict';

import testData from './cases.json' assert { type: 'json' };
import {
  UnleashClient,
  InMemoryStorageProvider,
} from 'unleash-proxy-client';

export const testSDKs = async (event) => {
  const body = JSON.parse(event.body);

  if (body.apiKey === undefined || body.url === undefined) {
    return { statusCode: 400 };
  }

  const [results, failures] = await testFrontendApi(body.url, body.apiKey);

  if (failures.length > 0) {
    try {
      const res = await fetch(
        'https://hooks.zapier.com/hooks/catch/11585290/3bhobts/',
        {
          method: 'POST',
          body: { data: JSON.stringify(failures) },
        }
      );
    } catch (e) {
      console.log('Error posting to slack');
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      {
        results: results,
      },
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

const getClient = (url, apiKey) => {
  return new UnleashClient({
    url: url,
    clientKey: apiKey,
    appName: 'nodejs-proxy',
    storageProvider: new InMemoryStorageProvider(),
    refreshInterval: 0,
  });
};

const testFrontendApi = async (url, apiKey) => {
  const results = {};
  const failures = [];

  const tests = testData.tests.map(async (testCase) => {
    const unleash = getClient(url, apiKey);
    await unleash.start();
    await unleash.updateContext(testCase.context);

    if (unleash.isEnabled(testCase.featureName) !== testCase.expected) {
      results[testCase.name] = {
        result: 'failed',
        expected: testCase.expected,
        actual: unleash.isEnabled(testCase.featureName),
      };

      failures.push({
        name: testCase.name,
        expected: testCase.expected,
        actual: unleash.isEnabled(testCase.featureName),
        context: testCase.context,
      });
    } else {
      results[testCase.name] = {
        result: 'passed',
        expected: testCase.expected,
        actual: unleash.isEnabled(testCase.featureName),
      };
    }
  });

  await Promise.all(tests);
  return [results, failures];
};
