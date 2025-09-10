const fs = require('fs');
const path = require('path');

const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
const versionTag = process.argv[2]; // e.g., "0.1.1"

if (!versionTag) {
  console.error('Usage: node get_release_notes.js <version_tag>');
  process.exit(1);
}

try {
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  const lines = changelogContent.split('\n');

  let inTargetVersionSection = false;
  const releaseNotes = [];

  // Regex to match any version header (## [X.Y.Z], ### [X.Y.Z], ### X.Y.Z)
  const versionHeaderRegex = /^(#+)\s*\[?(\d+\.\d+\.\d+)(?:-.+)?\]?/; 

  for (const line of lines) {
    const match = line.match(versionHeaderRegex);

    if (match) {
      const headerVersion = match[2]; // The version number from the header

      if (headerVersion === versionTag) {
        inTargetVersionSection = true;
        // Skip the header line itself
        continue;
      } else if (inTargetVersionSection) {
        // We found a new version header, so stop collecting notes for the target version
        break;
      }
    }

    if (inTargetVersionSection) {
      releaseNotes.push(line);
    }
  }

  // Trim leading/trailing empty lines
  let trimmedNotes = releaseNotes.join('\n').trim();

  // Remove any leading empty lines that might be left after trimming
  trimmedNotes = trimmedNotes.split('\n').filter(line => line.trim() !== '').join('\n');

  console.log(trimmedNotes);

} catch (error) {
  console.error(`Error reading or processing CHANGELOG.md: ${error.message}`);
  process.exit(1);
}
