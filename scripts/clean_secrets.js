// scripts/clean_secrets.js
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.on('readable', () => {
  let chunk;
  while (null !== (chunk = process.stdin.read())) {
    input += chunk;
  }
});

process.stdin.on('end', () => {
  if (input.trim() === '') {
    process.exit(0);
  }
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    process.exit(1);
  }

  // List of keys to be cleaned
  const keysToClean = [
    'plusLicenseKey',
    'openAIApiKey',
    'huggingfaceApiKey',
    'cohereApiKey',
    'anthropicApiKey',
    'azureOpenAIApiKey',
    'googleApiKey',
    'openRouterAiApiKey',
    'xaiApiKey',
    'mistralApiKey',
    'deepseekApiKey',
    'groqApiKey'
  ];

  // Clean top-level keys
  for (const key of keysToClean) {
    if (data[key] && data[key] !== '') {
      let envVarName = key.replace(/ApiKey$/, '').toUpperCase();
      if (envVarName === 'PLUSLICENSE') {
        envVarName = 'COPILOT_PLUS_LICENSE';
      }
      const placeholder = `__${envVarName}_KEY__`;
      data[key] = placeholder;
    }
  }

  // Output the cleaned JSON to stdout, which Git will then use.
  if (Object.keys(data).length > 0) {
    process.stdout.write(JSON.stringify(data, null, 2));
  } else {
    process.stdout.write('{}');
  }
});
