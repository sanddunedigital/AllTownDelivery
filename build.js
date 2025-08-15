#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

console.log('Building client for Vercel deployment...');
execSync('npx vite build', { stdio: 'inherit', cwd: process.cwd() });

// Update the build output to work with Vercel's routing
const indexPath = 'dist/public/index.html';
if (existsSync(indexPath)) {
  let indexContent = readFileSync(indexPath, 'utf8');

  // Ensure paths work with Vercel's routing
  indexContent = indexContent.replace(/href="\/assets\//g, 'href="/assets/');
  indexContent = indexContent.replace(/src="\/assets\//g, 'src="/assets/');

  writeFileSync(indexPath, indexContent);
  console.log('Updated index.html paths for Vercel');
} else {
  console.log('Index.html not found at expected path, build may have failed');
}

console.log('Build complete! Ready for Vercel deployment.');