#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // Run expo export using npx which handles the path resolution
  execSync('npx --yes expo export --platform web', {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  process.exit(error.status || 1);
}
