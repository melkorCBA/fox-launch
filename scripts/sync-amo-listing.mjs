#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const isDryRun = process.argv.includes('--dry-run');

function fail(msg) {
  console.error(`❌ [sync-amo-listing] ${msg}`);
  process.exit(1);
}

// 1. Read listing files
const metadataDir = path.resolve(process.cwd(), 'metadata/amo');
const summaryPath = path.join(metadataDir, 'summary.txt');
const descPath = path.join(metadataDir, 'description.md');
const configPath = path.join(metadataDir, 'config.json');

if (!fs.existsSync(summaryPath)) fail(`Missing ${summaryPath}`);
if (!fs.existsSync(descPath)) fail(`Missing ${descPath}`);
if (!fs.existsSync(configPath)) fail(`Missing ${configPath}`);

const summary = fs.readFileSync(summaryPath, 'utf8').trim();
const description = fs.readFileSync(descPath, 'utf8').trim();
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 2. Validate listing constraints
if (summary.length > 250) {
  fail(`summary.txt exceeds 250 characters (current length: ${summary.length})`);
}

const htmlTagRegex = /<[a-z][\s\S]*>/i;
if (htmlTagRegex.test(description)) {
  fail('description.md contains raw HTML tags. AMO markdown only allows standard Markdown syntax.');
}

const ALLOWED_AMO_TAGS = new Set([
  'ad blocker', 'anti malware', 'anti tracker', 'antivirus', 'chat', 'container',
  'content blocker', 'coupon', 'dailymotion', 'dark mode', 'dndbeyond', 'download',
  'facebook', 'google', 'image search', 'mp3', 'music', 'password manager',
  'pinterest', 'pixiv', 'privacy', 'reddit', 'roblox', 'scholar', 'search',
  'security', 'shopping', 'social media', 'streaming', 'torrent', 'translate',
  'twitch', 'twitter', 'user scripts', 'video converter', 'video downloader',
  'vpn', 'wayback machine', 'whatsapp', 'word counter', 'youtube', 'zoom'
]);

if (Array.isArray(config.tags)) {
  if (config.tags.length > 5) {
    fail(`config.json contains ${config.tags.length} tags. AMO permits a maximum of 5 tags.`);
  }
  const invalidTags = config.tags.filter((t) => !ALLOWED_AMO_TAGS.has(t));
  if (invalidTags.length > 0) {
    fail(`config.json contains invalid AMO tags: ${JSON.stringify(invalidTags)}. Allowed tags must match AMO whitelist (https://addons.mozilla.org/api/v5/addons/tags/).`);
  }
}

console.log('✅ Validation passed:');
console.log(`   - Summary length: ${summary.length}/250 characters`);
console.log(`   - Description length: ${description.length} characters`);
console.log(`   - Categories: ${JSON.stringify(config.categories)}`);
console.log(`   - Tags: ${JSON.stringify(config.tags)}`);

// 3. Resolve Addon ID
let manifestId = '';
const manifestPath = path.resolve(process.cwd(), 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifestId = manifest.browser_specific_settings?.gecko?.id || '';
}

const addonId = process.env.AMO_ADDON_ID || manifestId || 'foxlaunch';
console.log(`   - Target AMO Addon: ${addonId}`);

// 4. Construct Payload
const payload = {
  summary: { 'en-US': summary },
  description: { 'en-US': description },
  categories: config.categories,
  tags: config.tags,
};

if (config.homepage) {
  payload.homepage = { 'en-US': config.homepage };
}
if (config.support_url) {
  payload.support_url = { 'en-US': config.support_url };
}

if (isDryRun) {
  console.log('\n🔍 [DRY RUN] Payload to be submitted to AMO:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nDry run completed successfully. No changes sent to AMO.');
  process.exit(0);
}

// 5. Authenticate and PATCH
const issuer = process.env.AMO_JWT_ISSUER;
const secret = process.env.AMO_JWT_SECRET;

if (!issuer || !secret) {
  fail('Missing required environment variables: AMO_JWT_ISSUER and/or AMO_JWT_SECRET.');
}

function generateAmoJwt(iss, sec) {
  const b64url = (str) => Buffer.from(str).toString('base64url');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = b64url(
    JSON.stringify({
      iss,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + 300,
    })
  );
  const signature = crypto
    .createHmac('sha256', sec)
    .update(`${header}.${jwtPayload}`)
    .digest('base64url');
  return `${header}.${jwtPayload}.${signature}`;
}

const jwtToken = generateAmoJwt(issuer, secret);
const url = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(addonId)}/`;

console.log(`\n🚀 Sending PATCH request to ${url}...`);

try {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `JWT ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    fail(`AMO API returned error ${response.status} (${response.statusText}):\n${responseBody}`);
  }

  console.log(`✅ Successfully updated AMO store listing for ${addonId}!`);
  console.log(`Response status: ${response.status}`);
} catch (err) {
  fail(`Network error communicating with AMO API: ${err.message}`);
}
