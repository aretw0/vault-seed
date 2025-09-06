// scripts/smudge_secrets.js
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

let content = '';

process.stdin.on('readable', () => {
  let chunk;
  while (null !== (chunk = process.stdin.read())) {
    content += chunk;
  }
});

process.stdin.on('end', () => {
  if (content.trim() === '') {
    process.exit(0);
  }

  // Create a map of placeholders to environment variable names
  const keyMap = {
    '__PLUS_LICENSE_KEY__': 'COPILOT_PLUS_LICENSE_KEY',
    '__OPENAI_KEY__': 'OPENAI_API_KEY',
    '__HUGGINGFACE_KEY__': 'HUGGINGFACE_API_KEY',
    '__COHERE_KEY__': 'COHERE_API_KEY',
    '__ANTHROPIC_KEY__': 'ANTHROPIC_API_KEY',
    '__AZURE_OPENAI_KEY__': 'AZURE_OPENAI_API_KEY',
    '__GOOGLE_KEY__': 'GOOGLE_API_KEY',
    '__OPEN_ROUTER_AI_KEY__': 'OPENROUTER_AI_API_KEY',
    '__XAI_KEY__': 'XAI_API_KEY',
    '__MISTRAL_KEY__': 'MISTRAL_API_KEY',
    '__DEEPSEEK_KEY__': 'DEEPSEEK_API_KEY',
    '__GROQ_KEY__': 'GROQ_API_KEY',
    // This will also map the nested placeholders like __GOOGLE_API_KEY__
  };

  // Add provider keys to the map
  const providers = [
      'COPILOT_PLUS', 'OPENROUTERAI', 'OPENAI', 'ANTHROPIC', 'XAI', 
      'AZURE_OPENAI', 'DEEPSEEK', 'GOOGLE', 'COHEREAI' 
      /* add other providers from data.json if necessary */
    ];
  providers.forEach(provider => {
      const placeholder = `__${provider}_API_KEY__`;
      const envVar = `${provider}_API_KEY`;
      keyMap[placeholder] = envVar;
  });


  let smudgedContent = content;
  for (const placeholder in keyMap) {
    const envVar = keyMap[placeholder];
    const value = process.env[envVar];
    if (value) {
      // Use a regex to replace all occurrences of the placeholder
      const regex = new RegExp(placeholder, 'g');
      smudgedContent = smudgedContent.replace(regex, value);
    }
  }

  process.stdout.write(smudgedContent);
});