#!/usr/bin/env node
/**
 * Sets the version in manifest.json from the number of commits: the minor
 * number goes up by one every 3 commits, and the patch number counts the
 * commits since it last did. Commit 15 is 0.5.0, commit 16 is 0.5.1.
 *
 * Run before committing: node version.js
 * By default it counts the commit that is about to be made; pass --head to
 * use the current commit count as it stands.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COMMITS_PER_MINOR = 3;

const manifestPath = path.join(__dirname, 'manifest.json');
const head = Number(execSync('git rev-list --count HEAD', { cwd: __dirname }).toString().trim());
const commits = process.argv.includes('--head') ? head : head + 1;
const version = `0.${Math.floor(commits / COMMITS_PER_MINOR)}.${commits % COMMITS_PER_MINOR}`;

const manifest = fs.readFileSync(manifestPath, 'utf8');
const updated = manifest.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`);
if (updated === manifest && !manifest.includes(`"version": "${version}"`)) {
  throw new Error('Could not find the version field in manifest.json');
}
fs.writeFileSync(manifestPath, updated);
console.log(`Commit ${commits} -> version ${version}`);
