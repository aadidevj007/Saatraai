/**
 * Headless Chrome Audit Runner using native Chrome DevTools Protocol (CDP).
 * Zero external dependencies — uses Node 22+ built-in global WebSocket and http.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.resolve('audit_screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.events = [];
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        } else if (msg.method) {
          if (msg.method === 'Runtime.consoleAPICalled') {
            const type = msg.params.type;
            const args = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
            if (type === 'error') {
              this.consoleErrors.push(args);
            }
          } else if (msg.method === 'Runtime.exceptionThrown') {
            const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
            this.pageErrors.push(desc);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function getAuthTokens() {
  console.log('Obtaining authenticated session token from backend bridge...');
  const res = await fetch('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: 'dev-google-token:researcher@saatraai.local:Dr.%20Elena%20Rostova%20(Lead%20EO%20Scientist)',
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to obtain auth tokens: HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + 14 * 60 * 1000,
  };
}

async function runAudit() {
  console.log('Starting Headless Chrome on port', DEBUG_PORT);
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  // Wait for Chrome remote debugging port
  let targets = null;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      if (targets && targets.length > 0) break;
    } catch {
      // retry
    }
  }

  if (!targets || targets.length === 0) {
    chrome.kill();
    throw new Error('Failed to connect to Chrome debugging port.');
  }

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  console.log('Connected to Chrome DevTools Protocol successfully.');

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');
  await client.send('Network.enable');

  // Obtain test tokens and set in localStorage for protected pages
  const session = await getAuthTokens();
  console.log('Verified token obtained for:', 'researcher@saatraai.local');

  // Navigate to root first to establish domain context
  await client.send('Page.navigate', { url: `${BASE_URL}/` });
  await sleep(1500);

  // Inject session and profile completion into localStorage
  await client.send('Runtime.evaluate', {
    expression: `
      window.localStorage.setItem('saatraai.session', '${JSON.stringify(session)}');
      window.localStorage.setItem('saatraai.profile.is-new', '1');
      window.localStorage.setItem('saatraai.profile.preferences', JSON.stringify({
        organization: 'Global Earth Observation Lab',
        role: 'Lead Scientist',
        research_interest: 'Inundation and Climate Hazards'
      }));
    `,
  });
  console.log('Injected authenticated session and preferences into browser localStorage.');

  const pagesToAudit = [
    { name: 'landing', path: '/' },
    { name: 'sign_in', path: '/auth/sign-in' },
    { name: 'overview', path: '/overview' },
    { name: 'dashboard', path: '/dashboard' },
    { name: 'investigations', path: '/investigations' },
    { name: 'investigation_new', path: '/investigations/new' },
    { name: 'datasets', path: '/datasets' },
    { name: 'models', path: '/models' },
    { name: 'graph', path: '/graph' },
    { name: 'reports', path: '/reports' },
    { name: 'profile', path: '/profile' },
    { name: 'settings', path: '/settings' },
    { name: 'status', path: '/status' },
  ];

  const report = [];

  for (const page of pagesToAudit) {
    console.log(`\nAuditing page: ${page.name} (${page.path})...`);
    client.consoleErrors = [];
    client.pageErrors = [];

    await client.send('Page.navigate', { url: `${BASE_URL}${page.path}` });
    await sleep(2500); // allow Three.js / map / data queries to mount and settle

    // Read screen text and document details
    const evalResult = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const bodyText = document.body.innerText.replace(/\\s+/g, ' ').trim();
          const title = document.title;
          const h1 = Array.from(document.querySelectorAll('h1, h2')).map(h => h.innerText.trim()).filter(Boolean);
          const canvasCount = document.querySelectorAll('canvas').length;
          const buttonCount = document.querySelectorAll('button').length;
          const linkCount = document.querySelectorAll('a').length;
          const maplibreLoaded = Boolean(window.maplibregl || document.querySelector('.maplibregl-map'));
          const threeLoaded = Boolean(document.querySelector('canvas'));
          const hasErrorText = /error|failed to load|not found|unhandled/i.test(bodyText) && !/no errors/i.test(bodyText);
          return {
            title,
            headings: h1.slice(0, 4),
            snippet: bodyText.slice(0, 200),
            canvasCount,
            buttonCount,
            linkCount,
            maplibreLoaded,
            threeLoaded,
            hasErrorText,
          };
        })()
      `,
      returnByValue: true,
    });

    const pageData = evalResult.result.value;

    // Capture screenshot
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${page.name}.png`);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const pageReport = {
      name: page.name,
      path: page.path,
      title: pageData.title,
      headings: pageData.headings,
      snippet: pageData.snippet,
      canvasCount: pageData.canvasCount,
      buttonCount: pageData.buttonCount,
      consoleErrors: [...client.consoleErrors],
      pageErrors: [...client.pageErrors],
      screenshot: screenshotPath,
      status: client.pageErrors.length === 0 ? 'HEALTHY' : 'WARNING',
    };

    report.push(pageReport);
    console.log(`  ✓ Title: "${pageReport.title}"`);
    console.log(`  ✓ Headings: ${JSON.stringify(pageReport.headings)}`);
    console.log(`  ✓ Canvases: ${pageReport.canvasCount} | Buttons: ${pageReport.buttonCount}`);
    if (pageReport.consoleErrors.length > 0) {
      console.log(`  ⚠ Console errors (${pageReport.consoleErrors.length}):`, pageReport.consoleErrors);
    }
    if (pageReport.pageErrors.length > 0) {
      console.log(`  ❌ Page errors (${pageReport.pageErrors.length}):`, pageReport.pageErrors);
    }
    console.log(`  📸 Screenshot saved: ${screenshotPath}`);
  }

  client.close();
  chrome.kill();

  const reportPath = path.resolve('browser_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nAudit completed! Report saved to ${reportPath}`);
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
