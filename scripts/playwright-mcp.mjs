#!/usr/bin/env node
/**
 * Launches @playwright/mcp with whatever the current machine needs.
 *
 * The same config has to work on a laptop and in a cloud container, and those
 * two want different flags. Rather than committing one set and breaking the
 * other, work them out at start-up:
 *
 *   --no-sandbox       Chromium refuses to start as root, which is normal in a
 *                      container and never true on a developer machine.
 *   --executable-path  @playwright/mcp bundles its own playwright-core, whose
 *                      pinned Chromium build usually differs from the one a
 *                      pre-provisioned image ships. Point it at the installed
 *                      browser instead of letting it fail on a missing one.
 *
 * Anything you pass through reaches the server unchanged:
 *   node scripts/playwright-mcp.mjs --headless --isolated
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const args = [...process.argv.slice(2)];

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
if (isRoot && !args.includes('--no-sandbox')) args.push('--no-sandbox');

/** A Chromium from a pre-provisioned browser directory, if there is one. */
function provisionedChromium() {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!root || !existsSync(root)) return null;
    const builds = readdirSync(root)
        .filter((d) => d.startsWith('chromium-'))
        .sort()
        .reverse();
    for (const build of builds) {
        const exe = join(root, build, 'chrome-linux', 'chrome');
        if (existsSync(exe)) return exe;
    }
    return null;
}

if (!args.includes('--executable-path')) {
    const exe = provisionedChromium();
    if (exe) args.push('--executable-path', exe);
}

// stdio is the transport: the parent speaks JSON-RPC on stdin/stdout, so this
// process must stay out of the way and only forward.
const child = spawn('npx', ['-y', '@playwright/mcp@latest', ...args], { stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
