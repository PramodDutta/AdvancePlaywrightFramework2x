import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const ATTACH_SCREENSHOTS = process.env.ATTACH_SCREENSHOTS?.toLowerCase() === 'true';

function resolveBaseURL(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  const env = (process.env.TTA_ENV || 'qa').toLowerCase();
  switch (env) {
    case 'api':
      return process.env.API_BASE_URL || 'https://restful-booker.herokuapp.com';
    case 'dev':
    case 'local':
      return process.env.DEV_BASE_URL || 'http://localhost:3000';
    case 'stg':
    case 'stage':
    case 'staging':
      return process.env.STG_BASE_URL || 'https://stage.thetestingacademy.com';
    case 'prod':
    case 'production':
      return process.env.PROD_BASE_URL || 'https://app.thetestingacademy.com';
    case 'qa':
    default:
      return process.env.QA_BASE_URL || 'https://app.thetestingacademy.com';
  }

}


export default defineConfig({
  testDir: './src/tests',

  timeout: 60_000,

  expect: {
    timeout: 10_000
  },

  fullyParallel: true,

  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['html'],
    ['list'],
    ['./src/utils/CustomReporter.ts'],
  ],

  use: {
    baseURL: resolveBaseURL(),
    headless: false,
    screenshot: ATTACH_SCREENSHOTS ? 'only-on-failure' : 'off',
    video: 'on',
    trace: 'on'
  },

  projects: [
    {
      name: 'chromium',
      testDir: './src/tests',
      // API and AI specs live under src/tests but belong to their own projects.
      // Without this they would also run here, against the UI baseURL and a real browser.
      testIgnore: ['**/apisTests/**', '**/aiTest/**'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'api',
      testDir: './src/tests/apisTests',
      // No devices[...] spread, so no browser is launched for pure HTTP tests.
      use: {
        baseURL: process.env.API_BASE_URL || 'https://restful-booker.herokuapp.com'
      }
    },
    {
      name: 'ai',
      testDir: './src/tests/aiTest',
      // LLM calls plus HTTP. No browser. Longer timeout: a model round trip
      // costs seconds, and two of them plus retries can exceed the 60s default.
      timeout: 180_000,
      use: {
        baseURL: process.env.API_BASE_URL || 'https://restful-booker.herokuapp.com'
      }
    }
  ]
});
