import { expect, test, type Page, type Route } from '@playwright/test';

const user = {
  id: '92ddc290-8e5f-4edc-b945-1e77704e809d',
  email: 'researcher@example.test',
  display_name: 'Researcher',
};
const project = {
  id: '4976a1aa-ef25-48c9-9f10-d14c791efb9b',
  name: 'Coastal survey',
  description: null,
  created_at: '2026-10-23T00:00:00Z',
  updated_at: '2026-10-23T00:00:00Z',
};
const investigationId = '51dff2a3-b95a-48b1-b4bd-7a5f962e3be7';
const imageId = '9dc9c9a9-d75c-4815-9b8c-1148cd61bf07';

function investigation(configuration: Record<string, unknown> | null = null) {
  return {
    id: investigationId,
    project_id: project.id,
    title: 'Where did the shoreline change?',
    status: 'planned',
    configuration,
    created_at: '2026-10-23T00:00:00Z',
    updated_at: '2026-10-23T00:00:00Z',
  };
}

async function mockBasemap(page: Page) {
  await page.route('https://server.arcgisonline.com/**', async (route) => {
    if (route.request().resourceType() === 'image') return route.abort();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      version: 8,
      sources: {},
      layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e9dfd5' } }],
    }) });
  });
  await page.route('https://basemaps.cartocdn.com/**', (route) => route.abort());
  await page.route('https://a.tile.opentopomap.org/**', (route) => route.abort());
}

async function authenticateInBrowser(page: Page) {
  await page.addInitScript(({ sessionKey }) => {
    localStorage.setItem(sessionKey, JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Date.now() + 60_000,
    }));
    localStorage.setItem('saatraai.profile.is-new', '1');
  }, { sessionKey: 'saatraai.session' });
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test.beforeEach(async ({ page }) => {
  await authenticateInBrowser(page);
  await mockBasemap(page);
  await page.route('http://127.0.0.1:8000/health', (route) => fulfillJson(route, { status: 'ok', service: 'saatraai-api', version: '0.1.0' }));
  await page.route('http://127.0.0.1:8000/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/users/me') return fulfillJson(route, user);
    if (url.pathname === '/api/v1/status') return fulfillJson(route, { services: [], checked_at: '2026-10-23T00:00:00Z' });
    if (url.pathname === '/api/v1/projects') return fulfillJson(route, { items: [], page: 1, page_size: 100, total: 0 });
    return fulfillJson(route, { error: { code: 'unexpected_test_request', message: `Unhandled ${route.request().method()} ${url.pathname}`, details: null } }, 500);
  });
});

test('creates a project and investigation, uploads a scene, and shows the returned unavailable run status', async ({ page }) => {
  const persistedConfigurations: Record<string, unknown>[] = [];
  const persistedQueries: Array<Record<string, unknown>> = [];
  let uploaded = false;
  let executed = false;
  await page.route('http://127.0.0.1:8000/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/api/v1/users/me') return fulfillJson(route, user);
    if (path === '/api/v1/status') return fulfillJson(route, { services: [], checked_at: '2026-10-23T00:00:00Z' });
    if (path === '/api/v1/projects' && request.method() === 'GET') return fulfillJson(route, { items: [], page: 1, page_size: 100, total: 0 });
    if (path === '/api/v1/projects' && request.method() === 'POST') return fulfillJson(route, project, 201);
    if (path === '/api/v1/investigations' && request.method() === 'POST') {
      const body = request.postDataJSON() as { configuration: Record<string, unknown>; title: string; project_id: string };
      persistedConfigurations.push(body.configuration);
      expect(body.project_id).toBe(project.id);
      expect(body.title).toContain('Where did the shoreline change?');
      return fulfillJson(route, investigation(body.configuration), 201);
    }
    if (path === `/api/v1/investigations/${investigationId}/queries` && request.method() === 'POST') {
      const body = request.postDataJSON() as { text: string };
      expect(body.text).toBe('Where did the shoreline change?');
      const query = { id: '87c9d252-7c4d-4f30-8ea4-0b62920bca61', investigation_id: investigationId, text: body.text, sequence: 1, created_at: '2026-10-23T00:00:00Z', updated_at: '2026-10-23T00:00:00Z' };
      persistedQueries.push(query);
      return fulfillJson(route, query, 201);
    }
    if (path === `/api/v1/investigations/${investigationId}`) return fulfillJson(route, investigation(persistedConfigurations[0] ?? null));
    if (path === `/api/v1/investigations/${investigationId}/queries`) return fulfillJson(route, { items: persistedQueries });
    if (path === `/api/v1/investigations/${investigationId}/images` && request.method() === 'GET') {
      return fulfillJson(route, { items: uploaded ? [{ id: imageId, original_filename: 'scene.tif', modality: 'optical', acquisition_at: '2026-06-15T00:00:00Z', width: 32, height: 32, band_count: 3, crs: 'EPSG:4326', bounds: { left: 76, bottom: 9, right: 77, top: 10 }, file_format: 'GTiff', mime_type: 'image/tiff', checksum: 'test-checksum', storage_location: 'local://objects/test.tif' }] : [] });
    }
    if (path === `/api/v1/investigations/${investigationId}/images` && request.method() === 'POST') {
      uploaded = true;
      return fulfillJson(route, { investigation_id: investigationId, input_configuration: 'single_image', images: [{ id: imageId, original_filename: 'scene.tif', modality: 'optical', acquisition_at: '2026-06-15T00:00:00Z', width: 32, height: 32, band_count: 3, crs: 'EPSG:4326', bounds: { left: 76, bottom: 9, right: 77, top: 10 }, file_format: 'GTiff', mime_type: 'image/tiff', checksum: 'test-checksum', storage_location: 'local://objects/test.tif' }] }, 201);
    }
    if (path === `/api/v1/investigations/${investigationId}/executions` && request.method() === 'POST') {
      executed = true;
      return fulfillJson(route, { task_id: '2bc95efb-402e-4772-b8f0-c2281ebc9bb7', query_id: '87c9d252-7c4d-4f30-8ea4-0b62920bca61', selected_task: 'single_image_vqa', selected_tool: 'optical-vqa', model_version: 'geochat-7B', parameters: { question: 'Where did the shoreline change?' }, input_ids: [imageId], status: 'failed', started_at: '2026-10-23T00:00:00Z', completed_at: '2026-10-23T00:00:01Z', output_references: [], error: 'NOT_IMPLEMENTED: GEOCHAT_MODEL_PATH is not configured', evidence_id: null, idempotent_replay: false }, 201);
    }
    if (path === `/api/v1/investigations/${investigationId}/executions`) return fulfillJson(route, { items: executed ? [{ task_id: '2bc95efb-402e-4772-b8f0-c2281ebc9bb7', query_id: '87c9d252-7c4d-4f30-8ea4-0b62920bca61', selected_task: 'single_image_vqa', selected_tool: 'optical-vqa', model_version: 'geochat-7B', parameters: { question: 'Where did the shoreline change?' }, input_ids: [imageId], status: 'failed', started_at: '2026-10-23T00:00:00Z', completed_at: '2026-10-23T00:00:01Z', output_references: [], error: 'NOT_IMPLEMENTED: GEOCHAT_MODEL_PATH is not configured', evidence_id: null, idempotent_replay: false }] : [] });
    if (path.endsWith('/evidence') || path.endsWith('/hypotheses') || path.endsWith('/conclusions')) return fulfillJson(route, { items: [] });
    return fulfillJson(route, { error: { code: 'unexpected_test_request', message: `Unhandled ${request.method()} ${path}`, details: null } }, 500);
  });

  await page.goto('/investigations/new');
  await expect(page.getByLabel('Research question')).toBeVisible();
  await expect(page.locator('canvas.maplibregl-canvas')).toHaveCount(0);
  await page.getByLabel('Research question').fill('Where did the shoreline change?');
  await page.getByRole('button', { name: 'Select region' }).click();
  await page.getByLabel('Region presets').selectOption('chennai');
  await page.getByRole('button', { name: 'Set time range' }).click();
  await page.getByRole('button', { name: 'Choose data sources' }).click();
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await page.getByRole('button', { name: 'Review investigation' }).click();
  await expect(page.getByLabel('Project')).toBeVisible();
  await page.getByLabel('Project').selectOption('__new__');
  await expect(page.getByLabel('New project name')).toBeVisible();
  await page.getByLabel('New project name').fill('Coastal survey');
  await page.getByRole('button', { name: 'Create investigation' }).click();

  await expect(page).toHaveURL(new RegExp(`/investigations/${investigationId}`));
  await expect(page.getByRole('heading', { name: 'Where did the shoreline change?' }).first()).toBeVisible();
  await expect(page.getByText('Where did the shoreline change?').first()).toBeVisible();
  expect(persistedConfigurations[0]?.question).toBe('Where did the shoreline change?');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).click();

  const upload = page.locator('input[type="file"][accept*=".tif"]');
  await upload.setInputFiles({ name: 'scene.tif', mimeType: 'image/tiff', buffer: Buffer.from('test-fixture') });
  await expect(page.getByLabel('Scene A (before)')).toContainText('scene.tif');
  await page.getByRole('button', { name: 'Run analysis' }).first().click();
  await page.getByRole('button', { name: /scene\.tif/ }).click();
  await page.getByRole('button', { name: 'Execute' }).click();
  await expect(page.getByText(/NOT_IMPLEMENTED: GEOCHAT_MODEL_PATH is not configured/)).toBeVisible();
});

test('shows the API error when project loading fails', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/projects**', (route) => fulfillJson(route, {
    error: { code: 'http_503', message: 'Project service unavailable', details: null },
  }, 503));
  await page.goto('/investigations/new');
  await page.getByLabel('Research question').fill('Check an API outage');
  await page.getByRole('button', { name: 'Select region' }).click();
  await page.getByLabel('Region presets').selectOption('chennai');
  await page.getByRole('button', { name: 'Set time range' }).click();
  await page.getByRole('button', { name: 'Choose data sources' }).click();
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await page.getByRole('button', { name: 'Review investigation' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load your projects' })).toContainText('Project service unavailable');
  await expect(page.getByRole('button', { name: 'Create investigation' })).toBeDisabled();
});

test('mobile workspace drawer traps focus and restores it when dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/investigations/new');

  const trigger = page.getByRole('button', { name: 'Open navigation' });
  const sidebar = page.locator('#app-sidebar');
  await trigger.click();
  await expect(sidebar).toHaveClass(/translate-x-0/);

  const brandLink = page.getByRole('link', { name: 'SAATRAAI overview' });
  await expect(brandLink).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(sidebar).toHaveClass(/-translate-x-full/);
});
