const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function route(name, sql) {
  const source = fs.readFileSync(`app/api/${name}/route.ts`, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, URL, Request, require: name => {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => Response.json(body, options) } };
    if (name === '../../../lib/db') return { getSql: () => sql };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}
const request = body => new Request('https://source-stack.test/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('detail queue uses saved catalogue and requests pending products', async () => {
  let query;
  const api = route('storefront-product-details', async (strings, ...values) => {
    query = { text: strings.join('?'), values };
    return [{ asin: 'B08T5WX4KH', title: 'Existing catalogue product' }];
  });
  const response = await api.GET(new Request('https://source-stack.test/api?sellerId=A1BTXEEXK8JSEO&limit=1'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[0].asin, 'B08T5WX4KH');
  assert.match(query.text, /LEFT JOIN storefront_product_details/);
  assert.ok(query.values.includes('pending'));
  assert.equal(query.values.at(-1), 1);
});

test('invalid seller returns JSON without querying', async () => {
  const api = route('storefront-product-details', async () => assert.fail('Unexpected SQL'));
  const response = await api.GET(new Request('https://source-stack.test/api?sellerId=bad'));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).ok, false);
});

test('detail save refuses products outside the seller catalogue', async () => {
  let calls = 0;
  const api = route('storefront-product-details', async () => { calls++; return []; });
  const response = await api.POST(request({ sellerId: 'A1BTXEEXK8JSEO', asin: 'B08T5WX4KH' }));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'ASIN not in seller catalogue');
  assert.equal(calls, 1);
});

test('detail save preserves existing identifiers when capture is blank', async () => {
  const queries = [];
  const api = route('storefront-product-details', async (strings, ...values) => {
    queries.push({ text: strings.join('?'), values });
    return queries.length === 1 ? [{ exists: 1 }] : [];
  });
  const response = await api.POST(request({ sellerId: 'A1BTXEEXK8JSEO', asin: 'B08T5WX4KH', fields: { title: 'Captured product' } }));
  assert.equal(response.status, 200);
  assert.match(queries[1].text, /ean=COALESCE\(NULLIF\(EXCLUDED.ean,''\),storefront_product_details.ean\)/);
  assert.match(queries[1].text, /upc=COALESCE\(NULLIF\(EXCLUDED.upc,''\),storefront_product_details.upc\)/);
});

test('database failure stays a JSON error', async () => {
  const api = route('storefront-product-details', async () => { throw new Error('Database unavailable'); });
  const response = await api.GET(new Request('https://source-stack.test/api?sellerId=A1BTXEEXK8JSEO'));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).ok, false);
});

test('storefront rejects skipped pages to protect the checkpoint', async () => {
  let calls = 0;
  const api = route('storefront-scout', async () => { calls++; return [{ id: 1, last_saved_page: 2, status: 'running' }]; });
  const response = await api.POST(request({ action: 'save_page', runId: 1, page: 4, items: [] }));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /sequentially/);
  assert.equal(calls, 1);
});

function worker(state, fetch) {
  let listener;
  const navigations = [];
  const chrome = {
    storage: { local: { get: async () => ({ scoutState: state }), set: async value => { state = value.scoutState; } } },
    runtime: { onMessage: { addListener: fn => { listener = fn; } } },
    tabs: { update: async (...args) => navigations.push(args), onUpdated: { addListener() {} } },
    scripting: { executeScript: async () => {} },
    action: { onClicked: { addListener() {} } },
  };
  vm.runInNewContext(fs.readFileSync('extension/storefront-scout/background.js', 'utf8'), { chrome, fetch, URL, console });
  return { send: (msg) => new Promise(resolve => listener(msg, { tab: { id: 7 } }, resolve)), navigations, state: () => state };
}

test('restarted service worker recovers detail checkpoint before saving', async () => {
  const w = worker({ mode: 'details', tabId: 7, sellerId: 'A1BTXEEXK8JSEO', queue: ['B08T5WX4KH', 'B08NQ11PD2'], index: 0, status: 'running' }, async url => {
    assert.equal(url, 'https://stockwise-roan-gamma.vercel.app/api/storefront-product-details');
    return Response.json({ ok: true });
  });
  const result = await w.send({ action: 'detailCaptured', asin: 'B08T5WX4KH', fields: { title: 'Captured product' }, status: 'captured' });
  assert.equal(result.error, undefined);
  assert.equal(w.state().index, 1);
  assert.match(w.navigations[0][1].url, /B08NQ11PD2$/);
});

test('failed save pauses and retains the same product for resume', async () => {
  const w = worker({ mode: 'details', tabId: 7, sellerId: 'A1BTXEEXK8JSEO', queue: ['B08T5WX4KH'], index: 0, status: 'running' }, async () => Response.json({ ok: false, error: 'Save unavailable' }, { status: 500 }));
  const result = await w.send({ action: 'detailCaptured', asin: 'B08T5WX4KH', fields: {} });
  assert.equal(result.error, 'Save unavailable');
  assert.equal(w.state().index, 0);
  assert.equal(w.state().status, 'paused');
  assert.equal(w.navigations.length, 0);
});

test('extension permissions and API callers use the same public origin', () => {
  const manifest = JSON.parse(fs.readFileSync('extension/storefront-scout/manifest.json', 'utf8'));
  assert.equal(manifest.version, '0.4.2');
  assert.ok(manifest.host_permissions.includes('https://stockwise-roan-gamma.vercel.app/*'));
  for (const file of ['background.js', 'popup.js']) {
    const source = fs.readFileSync(`extension/storefront-scout/${file}`, 'utf8');
    assert.ok(source.includes('https://stockwise-roan-gamma.vercel.app/api/'));
    assert.ok(!source.includes('stockwise-rubbahead.vercel.app'));
  }
});
