/**
 * Self-healing locators — suggest, verify, never auto-apply.
 *
 * The agent proposes replacements for a dead locator; this module checks each
 * one against the live page before reporting it. That check is the whole point.
 * An unverified suggestion is worse than the original failure, because a
 * plausible-looking selector that matches the wrong element turns a red test
 * green while it asserts on nothing.
 *
 *   const healed = await healLocator(page, '[data-test="user-name"]', 'the username field');
 *   healed.verified   // candidates that actually resolve to exactly one element
 *   healed.rejected   // candidates the model proposed that do not resolve
 */

import type { Page } from '@playwright/test';
import { createLogger } from '@utils/logger';
import { selfHealAgent, type HealCandidate } from '../ai/agents/selfHealAgent';

const log = createLogger('self-heal');

export interface VerifiedCandidate extends HealCandidate {
    matchCount: number;
    visible: boolean;
    /** Only present when a `requires` check was requested. */
    editable?: boolean;
}

export interface HealOptions {
    /**
     * What the healed locator has to be good for. Resolving to one element is
     * not enough: a heading can match uniquely and still be unfillable, so a
     * candidate that cannot take the intended action is rejected, not ranked.
     */
    requires?: 'editable' | 'visible';
}

export interface HealReport {
    failedSelector: string;
    intent: string;
    verified: VerifiedCandidate[];
    rejected: { selector: string; reason: string }[];
    /** Absent when no key is set, or the agent returned nothing usable. */
    unavailableReason?: string;
}

/** Playwright's wording for "this locator found nothing", across its variants. */
const LOCATOR_FAILURE = /resolved to 0 elements|waiting for locator|strict mode violation|locator\.\w+: Timeout/i;

export function isLocatorFailure(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return LOCATOR_FAILURE.test(message);
}

/**
 * The interactive elements actually on the page, as compact markup.
 *
 * Sending the whole DOM would blow the token budget and bury the answer, so
 * this keeps only what a locator would plausibly target, with the attributes
 * that make a stable selector.
 */
export async function domDigest(page: Page, limit = 60): Promise<string> {
    return page.evaluate((max) => {
        const selector = 'input,button,a,select,textarea,[role],[data-test],[data-testid],[id]';
        const seen = new Set<string>();
        const lines: string[] = [];

        for (const el of Array.from(document.querySelectorAll(selector)).slice(0, max * 2)) {
            const attrs = ['id', 'name', 'type', 'role', 'placeholder', 'data-test', 'data-testid', 'aria-label', 'class']
                .map((a) => {
                    const v = el.getAttribute(a);
                    // A long class list is noise; the first two classes carry the signal.
                    const trimmed = a === 'class' && v ? v.split(/\s+/).slice(0, 2).join(' ') : v;
                    return trimmed ? ` ${a}="${trimmed}"` : '';
                })
                .join('');
            const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
            const line = `<${el.tagName.toLowerCase()}${attrs}>${text}</${el.tagName.toLowerCase()}>`;

            if (seen.has(line)) continue;
            seen.add(line);
            lines.push(line);
            if (lines.length >= max) break;
        }
        return lines.join('\n');
    }, limit);
}

/**
 * Ask for replacement locators, then prove which ones work.
 *
 * A candidate is verified only when it resolves to exactly one element. Zero
 * means the model invented it; more than one means it is ambiguous and would
 * throw under strict mode, so neither is offered as a fix.
 */
export async function healLocator(
    page: Page,
    failedSelector: string,
    intent: string,
    opts: HealOptions = {},
): Promise<HealReport> {
    const report: HealReport = { failedSelector, intent, verified: [], rejected: [] };

    const result = await selfHealAgent.run({
        failedSelector,
        intent,
        domDigest: await domDigest(page),
    });

    if (!result.available) {
        report.unavailableReason = result.reason;
        return report;
    }

    for (const candidate of result.data.candidates) {
        try {
            const locator = page.locator(candidate.selector);
            const matchCount = await locator.count();

            if (matchCount === 1) {
                const visible = await locator.first().isVisible();
                const editable = opts.requires === 'editable'
                    ? await locator.first().isEditable().catch(() => false)
                    : undefined;

                if (opts.requires === 'editable' && !editable) {
                    report.rejected.push({ selector: candidate.selector, reason: 'unique but not editable' });
                } else if (opts.requires === 'visible' && !visible) {
                    report.rejected.push({ selector: candidate.selector, reason: 'unique but not visible' });
                } else {
                    report.verified.push({ ...candidate, matchCount, visible, editable });
                }
            } else {
                report.rejected.push({
                    selector: candidate.selector,
                    reason: matchCount === 0 ? 'matched 0 elements' : `ambiguous: matched ${matchCount}`,
                });
            }
        } catch (error) {
            // An invalid selector is a rejection, not a crash.
            report.rejected.push({ selector: candidate.selector, reason: (error as Error).message.split('\n')[0] });
        }
    }

    log.info(`${failedSelector} -> ${report.verified.length} verified, ${report.rejected.length} rejected`);
    return report;
}
