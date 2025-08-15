#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('Testing build process...');

try {
  execSync('node build.js', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ Build test successful!');
} catch (error) {
  console.error('❌ Build test failed:', error.message);
  process.exit(1);
}