/**
 * Adversarial Verification Suite — Challenger M3-2
 *
 * Focus:
 * 1. Undo Toast Race Conditions & Timing Boundaries
 * 2. Drag & Drop Reordering Integrity (Intra-swimlane, Cross-swimlane prevention, Search-filtered)
 * 3. Storage Synchronization & Persistence Invariants
 */

import {
  test,
  expect,
  FoxLaunchLocators as loc,
  DEFAULT_MOCK_CONTAINERS,
  DEFAULT_SETTINGS,
  makeShortcut,
} from '../fixtures';

test.describe('Adversarial M3-2: Undo Toast & Race Conditions', () => {

  test('1.1 consecutive deletions: second deletion overwrites toast and undo restores the second deleted shortcut', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'First Shortcut', 'https://first.com', 0, 'sc-1'),
          makeShortcut('firefox-container-1', 'Second Shortcut', 'https://second.com', 1, 'sc-2'),
          makeShortcut('firefox-container-1', 'Third Shortcut', 'https://third.com', 2, 'sc-3'),
        ],
      },
    });

    const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');

    // 1. Delete First Shortcut
    const card1 = loc.shortcutCardByTitle(page, 'First Shortcut');
    await loc.shortcutMenuButton(card1).click();
    await loc.shortcutDeleteAction(page).click();

    // Verify first deletion happened and toast is visible
    await expect(loc.shortcutCardByTitle(page, 'First Shortcut')).not.toBeVisible();
    await expect(loc.toastNotification(page)).toBeVisible();

    // 2. Wait 2 seconds (simulating user hesitation)
    await page.waitForTimeout(2000);

    // 3. Delete Second Shortcut while first toast was active
    const card2 = loc.shortcutCardByTitle(page, 'Second Shortcut');
    await loc.shortcutMenuButton(card2).click();
    await loc.shortcutDeleteAction(page).click();

    // Second shortcut is now gone
    await expect(loc.shortcutCardByTitle(page, 'Second Shortcut')).not.toBeVisible();
    await expect(loc.toastNotification(page)).toBeVisible();

    // Verify only ONE toast notification exists in DOM (singleton behavior)
    const toastCount = await loc.toastNotification(page).count();
    expect(toastCount).toBe(1);

    // 4. Click Undo on the active toast
    await loc.toastUndoButton(page).click();

    // 5. Verify Second Shortcut is restored, while First Shortcut remains deleted
    await expect(loc.shortcutCardByTitle(page, 'Second Shortcut')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'First Shortcut')).not.toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Third Shortcut')).toBeVisible();

    // 6. Verify storage integrity: 2 items, contiguous indices 0 and 1
    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(2);
    expect(items.map((i: any) => i.title)).toEqual(['Second Shortcut', 'Third Shortcut']);
    expect(items[0].order).toBe(0);
    expect(items[1].order).toBe(1);
  });

  test('1.2 undo timing at the 4.5s boundary before 5s expiration successfully restores shortcut', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Boundary Item', 'https://boundary.com', 0),
        ],
      },
    });

    const card = loc.shortcutCardByTitle(page, 'Boundary Item');
    await loc.shortcutMenuButton(card).click();
    await loc.shortcutDeleteAction(page).click();

    await expect(loc.shortcutCardByTitle(page, 'Boundary Item')).not.toBeVisible();
    await expect(loc.toastNotification(page)).toBeVisible();

    // Wait 4500ms (just before the 5000ms threshold)
    await page.waitForTimeout(4500);

    // Toast should still be visible
    await expect(loc.toastNotification(page)).toBeVisible();

    // Click Undo at 4.5s mark
    await loc.toastUndoButton(page).click();

    // Card should be restored successfully
    await expect(loc.shortcutCardByTitle(page, 'Boundary Item')).toBeVisible();

    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Boundary Item');
  });

  test('1.3 undo timing after the 5.1s boundary: toast expires and shortcut is permanently purged', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Purge Candidate', 'https://purge.com', 0),
        ],
      },
    });

    const card = loc.shortcutCardByTitle(page, 'Purge Candidate');
    await loc.shortcutMenuButton(card).click();
    await loc.shortcutDeleteAction(page).click();

    await expect(loc.toastNotification(page)).toBeVisible();

    // Wait for expiration: 5.5 seconds
    await page.waitForTimeout(5500);

    // Toast must be completely removed from DOM
    await expect(loc.toastNotification(page)).not.toBeVisible();

    // Reload page to verify permanent purge from storage
    await mockHarness.reloadPage();

    await expect(loc.shortcutCardByTitle(page, 'Purge Candidate')).not.toBeVisible();
    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'] || [];
    expect(items).toHaveLength(0);
  });

  test('1.4 rapid sequential deletions: 3 items deleted in succession, undo restores only the last item, storage indices remain contiguous', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Item 1', 'https://1.com', 0),
          makeShortcut('firefox-container-1', 'Item 2', 'https://2.com', 1),
          makeShortcut('firefox-container-1', 'Item 3', 'https://3.com', 2),
        ],
      },
    });

    // Delete Item 1
    const card1 = loc.shortcutCardByTitle(page, 'Item 1');
    await loc.shortcutMenuButton(card1).click();
    await loc.shortcutDeleteAction(page).click();

    // Delete Item 2 immediately
    const card2 = loc.shortcutCardByTitle(page, 'Item 2');
    await loc.shortcutMenuButton(card2).click();
    await loc.shortcutDeleteAction(page).click();

    // Delete Item 3 immediately
    const card3 = loc.shortcutCardByTitle(page, 'Item 3');
    await loc.shortcutMenuButton(card3).click();
    await loc.shortcutDeleteAction(page).click();

    // Exactly one toast notification visible
    await expect(loc.toastNotification(page)).toBeVisible();
    expect(await loc.toastNotification(page).count()).toBe(1);

    // Undo the last deletion
    await loc.toastUndoButton(page).click();

    // Item 3 must be restored; Items 1 and 2 must remain deleted
    await expect(loc.shortcutCardByTitle(page, 'Item 3')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Item 1')).not.toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Item 2')).not.toBeVisible();

    // Storage must contain only Item 3 with order 0
    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Item 3');
    expect(items[0].order).toBe(0);
  });

  test('1.5 boundary timing at 4.85s: clicking undo immediately before expiration cancels timeout and restores shortcut', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Cusp Item', 'https://cusp.com', 0),
        ],
      },
    });

    const card = loc.shortcutCardByTitle(page, 'Cusp Item');
    await loc.shortcutMenuButton(card).click();
    await loc.shortcutDeleteAction(page).click();

    await expect(loc.toastNotification(page)).toBeVisible();

    // Wait exactly 4850ms (right on the edge of 5000ms expiration)
    await page.waitForTimeout(4850);

    // Toast should still exist
    await expect(loc.toastNotification(page)).toBeVisible();
    await loc.toastUndoButton(page).click();

    // Verify restored
    await expect(loc.shortcutCardByTitle(page, 'Cusp Item')).toBeVisible();

    // Wait an additional 1000ms to ensure no delayed timer removes or breaks it
    await page.waitForTimeout(1000);
    await expect(loc.shortcutCardByTitle(page, 'Cusp Item')).toBeVisible();

    const storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_shortcuts['firefox-container-1']).toHaveLength(1);
  });
});

test.describe('Adversarial M3-2: Drag and Drop Integrity', () => {

  test('2.1 intra-swimlane reordering: dragging first item to last produces strictly sequential 0..N indices and survives reload', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Alpha', 'https://alpha.com', 0, 'sc-alpha'),
          makeShortcut('firefox-container-1', 'Beta', 'https://beta.com', 1, 'sc-beta'),
          makeShortcut('firefox-container-1', 'Gamma', 'https://gamma.com', 2, 'sc-gamma'),
          makeShortcut('firefox-container-1', 'Delta', 'https://delta.com', 3, 'sc-delta'),
        ],
      },
    });

    const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');
    const sourceCard = loc.shortcutCardByTitle(page, 'Alpha');
    const targetCard = loc.shortcutCardByTitle(page, 'Delta');

    // Drag first item (Alpha) to last item (Delta)
    await sourceCard.dragTo(targetCard);

    // Verify storage order immediately after drop: should be Beta, Gamma, Delta, Alpha
    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(4);
    expect(items.map((i: any) => i.title)).toEqual(['Beta', 'Gamma', 'Delta', 'Alpha']);
    expect(items.map((i: any) => i.order)).toEqual([0, 1, 2, 3]);

    // Reload page to verify DOM order survives extension reload
    await mockHarness.reloadPage();

    const titles = await page.locator('.swimlane[data-cookie-store-id="firefox-container-1"] .shortcut-title').allTextContents();
    expect(titles).toEqual(['Beta', 'Gamma', 'Delta', 'Alpha']);
  });

  test('2.2 intra-swimlane reordering: dragging last item to first produces strictly sequential 0..N indices and survives reload', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Alpha', 'https://alpha.com', 0, 'sc-alpha'),
          makeShortcut('firefox-container-1', 'Beta', 'https://beta.com', 1, 'sc-beta'),
          makeShortcut('firefox-container-1', 'Gamma', 'https://gamma.com', 2, 'sc-gamma'),
          makeShortcut('firefox-container-1', 'Delta', 'https://delta.com', 3, 'sc-delta'),
        ],
      },
    });

    const sourceCard = loc.shortcutCardByTitle(page, 'Delta');
    const targetCard = loc.shortcutCardByTitle(page, 'Alpha');

    // Drag last item (Delta) to first item (Alpha)
    await sourceCard.dragTo(targetCard);

    // Verify storage order: Delta, Alpha, Beta, Gamma
    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(4);
    expect(items.map((i: any) => i.title)).toEqual(['Delta', 'Alpha', 'Beta', 'Gamma']);
    expect(items.map((i: any) => i.order)).toEqual([0, 1, 2, 3]);

    // Reload page to verify DOM persistence
    await mockHarness.reloadPage();

    const titles = await page.locator('.swimlane[data-cookie-store-id="firefox-container-1"] .shortcut-title').allTextContents();
    expect(titles).toEqual(['Delta', 'Alpha', 'Beta', 'Gamma']);
  });

  test('2.3 cross-swimlane drag prevention: dragging card from Container 1 to Container 2 is prevented and does not corrupt state', async ({ openFoxLaunch, page, mockHarness }) => {
    let pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Personal Link', 'https://pers.com', 0, 'sc-pers'),
        ],
        'firefox-container-2': [
          makeShortcut('firefox-container-2', 'Work Link', 'https://work.com', 0, 'sc-work'),
        ],
      },
    });

    const personalCard = loc.shortcutCardByTitle(page, 'Personal Link');
    const workCard = loc.shortcutCardByTitle(page, 'Work Link');

    // Attempt to drag across swimlanes
    await personalCard.dragTo(workCard);

    // Verify no unhandled exceptions occurred
    expect(pageErrors).toEqual([]);

    // Verify both items remain in their respective containers
    const storage = await mockHarness.getStorage();
    const c1Items = storage.foxlaunch_shortcuts['firefox-container-1'];
    const c2Items = storage.foxlaunch_shortcuts['firefox-container-2'];

    expect(c1Items).toHaveLength(1);
    expect(c1Items[0].title).toBe('Personal Link');
    expect(c1Items[0].cookieStoreId).toBe('firefox-container-1');

    expect(c2Items).toHaveLength(1);
    expect(c2Items[0].title).toBe('Work Link');
    expect(c2Items[0].cookieStoreId).toBe('firefox-container-2');

    // Reload and check DOM placement
    await mockHarness.reloadPage();

    const c1Titles = await page.locator('.swimlane[data-cookie-store-id="firefox-container-1"] .shortcut-title').allTextContents();
    expect(c1Titles).toEqual(['Personal Link']);

    const c2Titles = await page.locator('.swimlane[data-cookie-store-id="firefox-container-2"] .shortcut-title').allTextContents();
    expect(c2Titles).toEqual(['Work Link']);
  });

  test('2.4 drag and drop when search filter is active: reordering visible cards updates storage order correctly and preserves filter', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Docs Alpha', 'https://alpha.docs.com', 0, 'sc-1'),
          makeShortcut('firefox-container-1', 'Secret Portal', 'https://secret.com', 1, 'sc-2'),
          makeShortcut('firefox-container-1', 'Docs Beta', 'https://beta.docs.com', 2, 'sc-3'),
          makeShortcut('firefox-container-1', 'Unrelated Link', 'https://unrelated.com', 3, 'sc-4'),
        ],
      },
    });

    // Filter by "Docs"
    const searchInput = loc.searchInput(page);
    await searchInput.fill('Docs');

    // Visible cards are "Docs Alpha" and "Docs Beta"
    await expect(loc.shortcutCardByTitle(page, 'Docs Alpha')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Docs Beta')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Secret Portal')).not.toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Unrelated Link')).not.toBeVisible();

    // Drag "Docs Alpha" onto "Docs Beta"
    const alphaCard = loc.shortcutCardByTitle(page, 'Docs Alpha');
    const betaCard = loc.shortcutCardByTitle(page, 'Docs Beta');
    await alphaCard.dragTo(betaCard);

    // Verify storage: Docs Alpha moved to Docs Beta's index
    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(4);
    expect(items.map((i: any) => i.order)).toEqual([0, 1, 2, 3]);

    // Clear search and verify all 4 items exist with contiguous orders
    await searchInput.fill('');
    const allTitles = await page.locator('.swimlane[data-cookie-store-id="firefox-container-1"] .shortcut-title').allTextContents();
    expect(allTitles).toHaveLength(4);
    expect(allTitles).toContain('Docs Alpha');
    expect(allTitles).toContain('Docs Beta');
    expect(allTitles).toContain('Secret Portal');
    expect(allTitles).toContain('Unrelated Link');
  });

  test('2.5 dragging card onto itself is a safe no-op', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Solo Card', 'https://solo.com', 0, 'sc-solo'),
        ],
      },
    });

    const soloCard = loc.shortcutCardByTitle(page, 'Solo Card');
    await soloCard.dragTo(soloCard);

    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Solo Card');
    expect(items[0].order).toBe(0);
  });
});

test.describe('Adversarial M3-2: Storage Synchronization & Edge Invariants', () => {

  test('3.1 delete -> undo -> immediate page reload persists restored item across reload', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Resilient Item', 'https://resilient.com', 0),
        ],
      },
    });

    const card = loc.shortcutCardByTitle(page, 'Resilient Item');
    await loc.shortcutMenuButton(card).click();
    await loc.shortcutDeleteAction(page).click();

    await expect(loc.toastNotification(page)).toBeVisible();

    // Click Undo immediately
    await loc.toastUndoButton(page).click();
    await expect(loc.shortcutCardByTitle(page, 'Resilient Item')).toBeVisible();

    // Immediately reload page before 5s timeout
    await mockHarness.reloadPage();

    // Item must still be present and visible
    await expect(loc.shortcutCardByTitle(page, 'Resilient Item')).toBeVisible();
    const storage = await mockHarness.getStorage();
    expect(storage.foxlaunch_shortcuts['firefox-container-1']).toHaveLength(1);
  });

  test('3.2 drag reorder -> delete moved item -> undo restores it with valid contiguous order indices', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Distinct-A', 'https://a.com', 0),
          makeShortcut('firefox-container-1', 'Distinct-B', 'https://b.com', 1),
          makeShortcut('firefox-container-1', 'Distinct-C', 'https://c.com', 2),
        ],
      },
    });

    // 1. Move Distinct-A to Distinct-C (Distinct-A becomes last)
    const cardA = loc.shortcutCardByTitle(page, 'Distinct-A');
    const cardC = loc.shortcutCardByTitle(page, 'Distinct-C');
    await cardA.dragTo(cardC);

    // 2. Delete Distinct-A (the moved item)
    const movedA = loc.shortcutCardByTitle(page, 'Distinct-A');
    await loc.shortcutMenuButton(movedA).click();
    await loc.shortcutDeleteAction(page).click();

    // 3. Undo deletion of Distinct-A
    await loc.toastUndoButton(page).click();

    // Verify all 3 cards are present and orders are contiguous 0, 1, 2
    await expect(loc.shortcutCardByTitle(page, 'Distinct-A')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Distinct-B')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Distinct-C')).toBeVisible();

    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(3);
    expect(items.map((i: any) => i.order)).toEqual([0, 1, 2]);
  });

  test('3.3 rapid cycle: add -> drag reorder -> delete -> undo maintains exact storage state', async ({ openFoxLaunch, page, mockHarness }) => {
    await openFoxLaunch({
      containers: DEFAULT_MOCK_CONTAINERS,
      shortcuts: {
        'firefox-container-1': [
          makeShortcut('firefox-container-1', 'Base-1', 'https://base1.com', 0),
          makeShortcut('firefox-container-1', 'Base-2', 'https://base2.com', 1),
        ],
      },
    });

    const personalSwimlane = loc.swimlaneById(page, 'firefox-container-1');

    // 1. Add new item
    await loc.addShortcutButton(personalSwimlane).click();
    await loc.modalTitleInput(page).fill('Newly Added Item');
    await loc.modalUrlInput(page).fill('https://newlyadded.com');
    await loc.modalSubmitButton(page).click();

    await expect(loc.shortcutCardByTitle(page, 'Newly Added Item')).toBeVisible();

    // 2. Drag Newly Added Item to Base-1
    const newCard = loc.shortcutCardByTitle(page, 'Newly Added Item');
    const base1 = loc.shortcutCardByTitle(page, 'Base-1');
    await newCard.dragTo(base1);

    // 3. Delete Base-2
    const base2 = loc.shortcutCardByTitle(page, 'Base-2');
    await loc.shortcutMenuButton(base2).click();
    await loc.shortcutDeleteAction(page).click();

    // 4. Undo Base-2
    await loc.toastUndoButton(page).click();

    await expect(loc.shortcutCardByTitle(page, 'Base-2')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Newly Added Item')).toBeVisible();
    await expect(loc.shortcutCardByTitle(page, 'Base-1')).toBeVisible();

    const storage = await mockHarness.getStorage();
    const items = storage.foxlaunch_shortcuts['firefox-container-1'];
    expect(items).toHaveLength(3);
    expect(items.map((i: any) => i.order)).toEqual([0, 1, 2]);
  });
});

