import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export default async function globalSetup() {
  const build = spawnSync(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'build'], {
    env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8000' },
    stdio: 'inherit',
  });
  if (build.status !== 0) {
    throw new Error(`Next.js E2E build failed with exit code ${build.status ?? 'unknown'}`);
  }
}
