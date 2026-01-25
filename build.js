#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Path to the expo CLI
const expoCliPath = path.join(__dirname, 'node_modules', 'expo', 'bin', 'cli.js');

// Run expo export
const child = spawn('node', [expoCliPath, 'export', '--platform', 'web'], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('exit', (code) => {
  process.exit(code);
});
