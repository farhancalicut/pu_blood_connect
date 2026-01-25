#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Set execute permissions on the expo binary
  const expoBin = path.join(__dirname, 'node_modules', '.bin', 'expo');
  if (fs.existsSync(expoBin)) {
    fs.chmodSync(expoBin, '755');
  }
  
  // Run expo export
  execSync('npx expo export --platform web', {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  process.exit(error.status || 1);
}
