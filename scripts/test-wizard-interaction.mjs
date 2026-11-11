/**
 * Interactive browser test for New Investigation Wizard with NLP extraction.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9223;
const BASE_URL = 'http://localhost:3000';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
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
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            this.consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
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

async function testWizard() {
  console.log('Testing Investigation Wizard with live NLP entity extraction...');
  const res = await fetch('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: 'dev-google-token:researcher@saatraai.local:Dr.%20Elena%20Rostova',
    }),
  });
  const authData = await res.json();

  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await sleep(1000);
  const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const client = new CDPClient(targets[0].webSocketDebuggerUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');

  await client.send('Page.navigate', { url: `${BASE_URL}/` });
  await sleep(1000);

  // Authenticate session
  await client.send('Runtime.evaluate', {
    expression: `
      window.localStorage.setItem('saatraai.session', '${JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        expires_at: Date.now() + 14 * 60 * 1000,
      })}');
      window.localStorage.setItem('saatraai.profile.is-new', '1');
    `,
  });

  // Navigate to /investigations/new
  await client.send('Page.navigate', { url: `${BASE_URL}/investigations/new` });
  await sleep(2000);

  // Type question into textarea
  const promptText = 'Why has flooding increased in Kerala between 2022 and 2026?';
  console.log(`Setting prompt: "${promptText}"`);
  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const textarea = document.getElementById('question');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(textarea, ${JSON.stringify(promptText)});
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      })()
    `,
  });

  // Wait for NLP debounce & extraction
  await sleep(1200);

  // Read NLP extraction card from DOM
  const nlpCardResult = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const text = document.body.innerText;
        const hasNlpCard = text.includes('NLP Automated Entity Extraction');
        const hasRegion = text.includes('Kochi / Ernakulam, Kerala') || text.includes('Kerala');
        const hasSpan = text.includes('2022-01-01') && text.includes('2026-12-31');
        const hasSources = text.includes('OPTICAL') && text.includes('SAR') && text.includes('RAINFALL');
        return { hasNlpCard, hasRegion, hasSpan, hasSources };
      })()
    `,
    returnByValue: true,
  });

  console.log('NLP Extraction Evaluation:', nlpCardResult.result.value);

  // Take screenshot of step 1 with NLP extraction
  const ss1 = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('audit_screenshots/wizard_step1_nlp.png', Buffer.from(ss1.data, 'base64'));

  // Click "Select region" button (proceed to Step 2)
  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Select region'));
        if (btn) btn.click();
      })()
    `,
  });
  await sleep(1500);

  // Check Step 2 (Region Picker & Map)
  const step2Result = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const text = document.body.innerText;
        const hasMap = Boolean(document.querySelector('.maplibregl-map') || document.querySelector('canvas'));
        const regionTitle = text.includes('Define the region of interest');
        return { hasMap, regionTitle };
      })()
    `,
    returnByValue: true,
  });
  console.log('Step 2 (Region & Map) Evaluation:', step2Result.result.value);

  const ss2 = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('audit_screenshots/wizard_step2_map.png', Buffer.from(ss2.data, 'base64'));

  // Click "Set time range" (proceed to Step 3)
  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Set time range'));
        if (btn) btn.click();
      })()
    `,
  });
  await sleep(1000);

  // Check Step 3 (Time range inputs filled by NLP)
  const step3Result = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const startVal = document.getElementById('start')?.value;
        const endVal = document.getElementById('end')?.value;
        return { startVal, endVal };
      })()
    `,
    returnByValue: true,
  });
  console.log('Step 3 (Time Range) Evaluation:', step3Result.result.value);

  const ss3 = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('audit_screenshots/wizard_step3_time.png', Buffer.from(ss3.data, 'base64'));

  // Click "Choose data sources" (proceed to Step 4)
  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Choose data sources'));
        if (btn) btn.click();
      })()
    `,
  });
  await sleep(1500);

  // Check Step 4 (Evidence sources states)
  const step4Result = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const text = document.body.innerText;
        const hasLiveStatus = text.includes('LIVE STATUS');
        const availableCount = (text.match(/AVAILABLE/g) || []).length;
        const unconfiguredCount = (text.match(/NOT CONFIGURED/g) || []).length;
        return { hasLiveStatus, availableCount, unconfiguredCount };
      })()
    `,
    returnByValue: true,
  });
  console.log('Step 4 (Data Sources Status) Evaluation:', step4Result.result.value);

  const ss4 = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('audit_screenshots/wizard_step4_sources.png', Buffer.from(ss4.data, 'base64'));

  client.close();
  chrome.kill();
  console.log('\nInvestigation Wizard interactive test completed successfully!');
}

testWizard().catch((err) => {
  console.error('Wizard test failed:', err);
  process.exit(1);
});

