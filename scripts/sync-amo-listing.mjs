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

const screenshots = [
  'foxlaunch-dark-1280x800.png',
  'foxlaunch-light-1280x800.png',
].map((filename) => {
  const screenshotPath = path.join(metadataDir, 'screenshots', filename);
  if (!fs.existsSync(screenshotPath)) fail(`Missing screenshot: ${screenshotPath}. Prepare and commit the listing screenshots using the release skill before syncing.`);
  const image = fs.readFileSync(screenshotPath);
  if (image.length < 24 || !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    fail(`Invalid PNG screenshot: ${screenshotPath}`);
  }
  return { filename, image };
});

if (isDryRun) {
  console.log('\n🔍 [DRY RUN] Payload to be submitted to AMO:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nScreenshots to replace the AMO previews (dark, then light):');
  for (const { filename, image } of screenshots) {
    console.log(`   - ${filename} (${image.length} bytes)`);
  }
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

const url = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(addonId)}/`;

async function request(endpoint, options, operation) {
  let response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `JWT ${generateAmoJwt(issuer, secret)}`,
        ...options.headers,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new Error(`${operation}: ${err.message}`);
  }
  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`${operation}: AMO API returned error ${response.status} (${response.statusText}):\n${responseBody}`);
  }
  return responseBody;
}

const uploadedIds = [];
let listingUpdated = false;
try {
  const addon = JSON.parse(await request(url, { method: 'GET' }, 'Read existing screenshots'));
  if (!Array.isArray(addon.previews) || addon.previews.some(({ id }) => !Number.isInteger(id) || id <= 0)) {
    throw new Error('AMO returned an invalid previews list; refusing to replace screenshots.');
  }
  for (const [position, { filename, image }] of screenshots.entries()) {
    console.log(`\n🚀 Uploading screenshot ${filename}...`);
    const form = new FormData();
    form.append('image', new Blob([image], { type: 'image/png' }), filename);
    form.append('position', String(position));
    const preview = JSON.parse(await request(`${url}previews/`, {
      method: 'POST',
      body: form,
    }, `Upload screenshot ${filename}`));
    if (!Number.isInteger(preview.id) || preview.id <= 0) {
      throw new Error(`Upload screenshot ${filename}: AMO did not return a valid preview ID. Check the AMO listing before retrying.`);
    }
    uploadedIds.push(preview.id);
  }

  console.log(`\n🚀 Sending PATCH request to ${url}...`);
  await request(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, 'Update listing metadata');
  listingUpdated = true;

  // Keep the old screenshots until every upload and the metadata update succeeds.
  for (const { id } of addon.previews) {
    await request(`${url}previews/${id}/`, { method: 'DELETE' }, `Delete old screenshot ${id}`);
  }

  console.log(`✅ Successfully updated AMO store listing and ${screenshots.length} screenshots for ${addonId}!`);
} catch (err) {
  if (!listingUpdated) {
    for (const id of uploadedIds) {
      try {
        await request(`${url}previews/${id}/`, { method: 'DELETE' }, `Roll back screenshot ${id}`);
      } catch (cleanupError) {
        console.error(`❌ Screenshot rollback failed: ${cleanupError.message}. Check the AMO listing before retrying.`);
      }
    }
  }
  fail(`Listing/screenshot sync failed: ${err.message}${listingUpdated ? '\nThe listing was updated, but old screenshot cleanup is incomplete. Check the AMO listing before retrying.' : ''}`);
}
