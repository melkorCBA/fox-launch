import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const script = path.join(root, 'scripts/sync-amo-listing.mjs');

function runSync(dryRun = false, failure = '') {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'foxlaunch-amo-'));
  try {
    fs.cpSync(path.join(root, 'metadata/amo'), path.join(cwd, 'metadata/amo'), { recursive: true });
    fs.rmSync(path.join(cwd, 'metadata/amo/screenshots'), { recursive: true, force: true });

    const tracePath = path.join(cwd, 'requests.json');
    const mockPath = path.join(cwd, 'mock.mjs');
    fs.writeFileSync(mockPath, `
      import fs from 'node:fs';
      const requests = [];
      globalThis.fetch = async (url, options) => {
        const request = { url, method: options.method, redirect: options.redirect };
        if (options.body) request.payload = JSON.parse(options.body);
        requests.push(request);
        fs.writeFileSync(${JSON.stringify(tracePath)}, JSON.stringify(requests));
        if (${JSON.stringify(dryRun)}) throw new Error('Dry run must not use fetch');
        if (${JSON.stringify(failure)} === 'metadata') {
          return new Response('simulated AMO failure', { status: 503 });
        }
        return new Response(null, { status: 200 });
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
      },
    });
    const requests = fs.existsSync(tracePath) ? JSON.parse(fs.readFileSync(tracePath, 'utf8')) : [];
    return { ...result, requests };
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

test.describe('AMO listing metadata sync', () => {
  test('dry run validates and prints the metadata payload without credentials or network requests', () => {
    const result = runSync(true);
    expect(result.status, result.stderr).toBe(0);
    expect(result.requests).toEqual([]);
    expect(result.stdout).toContain('"summary"');
    expect(result.stdout).toContain('"categories"');
    expect(result.stdout).toContain('"tags"');
    expect(result.stdout).toContain('No changes sent to AMO');
    expect(result.stdout).not.toContain('screenshot');
  });

  test('syncs metadata and tags using only one metadata PATCH without screenshots', () => {
    const result = runSync();
    expect(result.status, result.stderr).toBe(0);
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].method).toBe('PATCH');
    expect(result.requests[0].url).toBe('https://addons.mozilla.org/api/v5/addons/addon/test%2Faddon/');
    expect(result.requests[0].redirect).toBe('error');
    expect(result.requests[0].payload.summary['en-US']).toBeTruthy();
    expect(result.requests[0].payload.description['en-US']).toBeTruthy();
    expect(result.requests[0].payload.categories).toEqual({ firefox: ['bookmarks', 'tabs'] });
    expect(result.requests[0].payload.tags).toEqual(['container', 'privacy', 'search', 'dark mode', 'security']);
    expect(result.stdout).toContain('Successfully updated AMO store listing metadata');
    expect(result.stdout).not.toContain('screenshot');
  });

  test('reports metadata update failures clearly', () => {
    const result = runSync(false, 'metadata');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Listing metadata sync failed');
    expect(result.stderr).toContain('503');
  });

  test('workflow syncs metadata without screenshot inputs or capture steps and retains approval and dry-run gates', () => {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows/sync-listing.yml'), 'utf8');
    expect(workflow).toContain('environment: production-amo');
    expect(workflow).toContain('DRY_RUN_FLAG="--dry-run"');
    expect(workflow).toContain('node scripts/sync-amo-listing.mjs');
    expect(workflow).toContain('concurrency:');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).not.toContain('skip_screenshots');
    expect(workflow).not.toContain('capture-amo-screenshots');
    expect(workflow).not.toContain('playwright');
    expect(workflow).not.toContain('continue-on-error');

    const releaseWorkflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');
    expect(releaseWorkflow).toContain('Manual AMO screenshot upload');
    expect(releaseWorkflow).toContain('metadata/amo/screenshots/');
  });
});
