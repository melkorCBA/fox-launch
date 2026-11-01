import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const script = path.join(root, 'scripts/sync-amo-listing.mjs');

function runSync(dryRun = false, failure = '', invalidImage = false) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'foxlaunch-amo-'));
  try {
    fs.cpSync(path.join(root, 'metadata/amo'), path.join(cwd, 'metadata/amo'), { recursive: true });
    if (invalidImage) {
      // Signature-preserving truncated / invalid PNG (fails structure/IHDR check)
      fs.writeFileSync(
        path.join(cwd, 'metadata/amo/screenshots/foxlaunch-light-2400x1800.png'),
        Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16, 0)])
      );
    }
    // Snapshot isolated temporary images before script execution
    const snapshots = new Map();
    for (const theme of ['dark', 'light']) {
      const filename = `foxlaunch-${theme}-2400x1800.png`;
      const filePath = path.join(cwd, 'metadata/amo/screenshots', filename);
      if (fs.existsSync(filePath)) {
        snapshots.set(filename, fs.readFileSync(filePath));
      }
    }

    const tracePath = path.join(cwd, 'requests.json');
    const mockPath = path.join(cwd, 'mock.mjs');
    fs.writeFileSync(mockPath, `
      import fs from 'node:fs';
      const requests = [];
      globalThis.fetch = async (url, options) => {
        const request = { url, method: options.method, redirect: options.redirect };
        if (options.body instanceof FormData) {
          const image = options.body.get('image');
          request.image = { name: image.name, type: image.type, size: image.size };
          request.position = options.body.get('position');
          request.contentType = options.headers['Content-Type'];
        } else if (options.body) {
          request.payload = JSON.parse(options.body);
        }
        requests.push(request);
        fs.writeFileSync(${JSON.stringify(tracePath)}, JSON.stringify(requests));
        if (${JSON.stringify(dryRun)}) throw new Error('Dry run must not use fetch');
        const failure = ${JSON.stringify(failure)};
        if ((failure === 'upload' && request.position === '1') ||
            (failure === 'metadata' && options.method === 'PATCH') ||
            (failure === 'rollback' && (request.position === '1' || url.endsWith('/previews/101/')))) {
          return new Response('simulated AMO failure', { status: 503 });
        }
        if (failure === 'network' && options.method === 'POST') throw new Error('connection reset');
        if (options.method === 'GET') {
          const hasPost = requests.some((r) => r.method === 'POST');
          if (hasPost) {
            if (failure === 'processing') {
              return Response.json({ previews: [{ id: 11 }, { id: 12 }, { id: 101 }, { id: 102 }] });
            }
            return Response.json({
              previews: [
                { id: 11 },
                { id: 12 },
                { id: 101, image_url: 'https://addons.mozilla.org/image.png', thumbnail_url: 'https://addons.mozilla.org/thumb.png' },
                { id: 102, image_url: 'https://addons.mozilla.org/image.png', thumbnail_url: 'https://addons.mozilla.org/thumb.png' },
              ],
            });
          }
          return Response.json({ previews: [{ id: 11 }, { id: 12 }] });
        }
        if (options.method === 'POST') {
          return Response.json(failure === 'invalid-id' ? {} : { id: 101 + Number(request.position) }, { status: 201 });
        }
        return new Response(null, { status: options.method === 'DELETE' ? 204 : 200 });
      };
    `);
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(mockPath).href, script, ...(dryRun ? ['--dry-run'] : [])], {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        AMO_ADDON_ID: 'test/addon',
        AMO_JWT_ISSUER: dryRun ? '' : 'test-issuer',
        AMO_JWT_SECRET: dryRun ? '' : 'test-only-placeholder',
        AMO_PREVIEW_TIMEOUT_MS: '200',
      },
    });
    const requests = fs.existsSync(tracePath) ? JSON.parse(fs.readFileSync(tracePath, 'utf8')) : [];
    const imagesUnchanged = ['dark', 'light'].every((theme) => {
      const filename = `foxlaunch-${theme}-2400x1800.png`;
      const currentPath = path.join(cwd, 'metadata/amo/screenshots', filename);
      return fs.existsSync(currentPath) &&
        snapshots.has(filename) &&
        fs.readFileSync(currentPath).equals(snapshots.get(filename));
    });
    return { ...result, requests, imagesUnchanged };
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

test.describe('AMO listing screenshot sync', () => {
  test('dry run validates and describes both images without credentials or network requests', () => {
    const result = runSync(true);
    expect(result.status, result.stderr).toBe(0);
    expect(result.requests).toEqual([]);
    expect(result.imagesUnchanged).toBe(true);
    expect(result.stdout).toContain('foxlaunch-dark-2400x1800.png');
    expect(result.stdout).toContain('foxlaunch-light-2400x1800.png');
    expect(result.stdout).toContain('No changes sent to AMO');
  });

  test('rejects invalid screenshots before publishing even in a dry run', () => {
    const result = runSync(true, '', true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid PNG screenshot');
    expect(result.requests).toEqual([]);
  });

  test('uploads multipart images in order before updating metadata and retaining existing previews', () => {
    const result = runSync();
    expect(result.status, result.stderr).toBe(0);
    expect(result.imagesUnchanged).toBe(true);
    expect(result.requests.map((request: { method: string }) => request.method))
      .toEqual(['GET', 'POST', 'POST', 'GET', 'GET', 'PATCH']);
    for (const [position, theme] of ['dark', 'light'].entries()) {
      const request = result.requests[position + 1];
      expect(request.url).toBe('https://addons.mozilla.org/api/v5/addons/addon/test%2Faddon/previews/');
      expect(request.image.name).toBe(`foxlaunch-${theme}-2400x1800.png`);
      expect(request.image.type).toBe('image/png');
      expect(request.image.size).toBeGreaterThan(24);
      expect(request.position).toBe(String(position));
      expect(request.contentType).toBeUndefined();
      expect(request.redirect).toBe('error');
    }
    expect(result.requests[5].payload.summary['en-US']).toBeTruthy();
    expect(result.stdout).toContain('Retained 2 existing screenshot preview(s)');
  });

  test('upload failure preserves old previews and rolls back the first new upload', () => {
    const result = runSync(false, 'upload');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Upload screenshot foxlaunch-light-2400x1800.png');
    expect(result.stderr).toContain('503');
    expect(result.requests.map((request: { method: string }) => request.method))
      .toEqual(['GET', 'POST', 'POST', 'DELETE']);
    expect(result.requests[3].url).toContain('/previews/101/');
  });

  test('metadata failure rolls back both new uploads without deleting old previews', () => {
    const result = runSync(false, 'metadata');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Update listing metadata');
    expect(result.requests.slice(-2).map((request: { url: string }) => request.url.split('/').at(-2)))
      .toEqual(['101', '102']);
  });

  for (const failure of ['network', 'invalid-id', 'processing', 'rollback']) {
    test(`surfaces ${failure} failures clearly`, () => {
      const result = runSync(false, failure);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Listing/screenshot sync failed');
      if (failure === 'network') expect(result.stderr).toContain('connection reset');
      if (failure === 'invalid-id') expect(result.stderr).toContain('valid preview ID');
      if (failure === 'processing') expect(result.stderr).toContain('processing timed out');
      if (failure === 'rollback') expect(result.stderr).toContain('Screenshot rollback failed');

    });
  }

  test('workflow syncs existing images without capture and retains approval and dry-run gates', () => {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows/sync-listing.yml'), 'utf8');
    expect(workflow).toContain('environment: production-amo');
    expect(workflow).toContain('DRY_RUN_FLAG="--dry-run"');
    expect(workflow).toContain('node scripts/sync-amo-listing.mjs');
    expect(workflow).toContain('concurrency:');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).not.toContain('capture-amo-screenshots');
    expect(workflow).not.toContain('playwright');
    expect(workflow).not.toContain('pnpm');
    expect(workflow).not.toContain('continue-on-error');
  });
});
