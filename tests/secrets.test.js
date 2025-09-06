// tests/secrets.test.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to run shell commands
const runCommand = (command, options = {}) => {
  try {
    return execSync(command, { encoding: 'utf8', ...options });
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.stdout);
    console.error(error.stderr);
    throw error;
  }
};

describe('Git clean/smudge filters for secrets', () => {
  const tempDir = path.join(__dirname, 'temp_git_repo');
  const dataJsonPath = path.join(tempDir, '.obsidian', 'plugins', 'copilot', 'data.json');
  const envFilePath = path.join(tempDir, '.env');
  const cleanScriptPath = path.resolve(__dirname, '../scripts/clean_secrets.js');
  const smudgeScriptPath = path.resolve(__dirname, '../scripts/smudge_secrets.js');

  const realApiKey = 'sk-test-real-api-key';
  const placeholderApiKey = '__OPENAI_KEY__'; // Example placeholder from clean_secrets.js

  beforeAll(() => {
    // Create a temporary directory for the test Git repo
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Initialize a Git repo
    runCommand('git init', { cwd: tempDir });

    const relativeCleanScriptPath = path.relative(tempDir, cleanScriptPath).replace(/\\/g, '/');
    const relativeSmudgeScriptPath = path.relative(tempDir, smudgeScriptPath).replace(/\\/g, '/');

    // Configure the clean/smudge filters locally for this temp repo
    runCommand(`git config filter.copilot-secrets.clean "node ${relativeCleanScriptPath} %f"`, { cwd: tempDir });
    runCommand(`git config filter.copilot-secrets.smudge "node ${relativeSmudgeScriptPath}"`, { cwd: tempDir });

    // Create a dummy .gitattributes file
    fs.writeFileSync(path.join(tempDir, '.gitattributes'), '.obsidian/plugins/copilot/data.json filter=copilot-secrets diff=copilot-secrets');

    // Create a dummy .env file with the real API key
    fs.writeFileSync(envFilePath, `OPENAI_API_KEY=${realApiKey}`);

    // Create necessary directories for data.json
    fs.mkdirSync(path.dirname(dataJsonPath), { recursive: true });
  });

  afterAll(() => {
    // Clean up the temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('clean filter should replace API keys with placeholders', () => {
    // Create a dummy data.json with a real API key
    const initialData = { openAIApiKey: realApiKey, otherSetting: 'value' };
    fs.writeFileSync(dataJsonPath, JSON.stringify(initialData, null, 2));

    // Add the file to staging, triggering the clean filter
    runCommand(`git add ${dataJsonPath}`, { cwd: tempDir });

    // Read the staged content (which should be cleaned)
    const relativeDataJsonPath = path.relative(tempDir, dataJsonPath).replace(/\\/g, '/');
    const stagedContent = runCommand(`git show :${relativeDataJsonPath}`, { cwd: tempDir });
    const parsedStagedContent = JSON.parse(stagedContent);

    expect(parsedStagedContent.openAIApiKey).toBe(placeholderApiKey);
    expect(parsedStagedContent.otherSetting).toBe('value');
  });

  test('smudge filter should restore API keys from .env', () => {
    // Ensure the file is in the index with the placeholder
    const cleanedData = { openAIApiKey: placeholderApiKey, otherSetting: 'value' };
    fs.writeFileSync(dataJsonPath, JSON.stringify(cleanedData, null, 2));
    runCommand(`git add ${dataJsonPath}`, { cwd: tempDir });
    runCommand('git commit -m "test commit"', { cwd: tempDir }); // Commit the cleaned version

    // Delete the local file to force git checkout from index
    fs.unlinkSync(dataJsonPath);

    // Checkout the file, triggering the smudge filter
    runCommand(`git checkout ${dataJsonPath}`, { cwd: tempDir });

    // Read the local file (which should be smudged)
    const smudgedContent = fs.readFileSync(dataJsonPath, 'utf8');
    const parsedSmudgedContent = JSON.parse(smudgedContent);

    expect(parsedSmudgedContent.openAIApiKey).toBe(realApiKey);
    expect(parsedSmudgedContent.otherSetting).toBe('value');
  });
});
