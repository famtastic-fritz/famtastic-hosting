/**
 * Editable page content loader.
 *
 * Pages use getPageContent(page) to fetch content from the DB.
 * If the DB is empty or a key is missing, hardcoded defaults are returned
 * so the site always renders.
 */

import { pool } from './db/pool.js';

export type PageContent = Record<string, Record<string, string | null>>;

const DEFAULTS: Record<string, PageContent> = {
  index: {
    hero: {
      prompt: '// famtastichosting.com',
      headline_line1: 'Your domain.',
      headline_line2: 'Your brand.',
      headline_line3: 'Handled.',
      subheadline: 'Premium hosting from $7/mo. Custom nameservers. Your brand on everything.',
      primary_cta: 'Explore Plans',
      primary_cta_url: '#products',
      secondary_cta: 'Contact Us',
      secondary_cta_url: '/contact',
    },
    trust_bar: {
      item_1: '99.9% Uptime',
      item_2: '1,000+ Sites Hosted',
      item_3: 'Based in Miami, FL',
    },
    story_1: {
      title: 'Hosting that stays out of your way',
      body: 'You have a business to run. The last thing you need is a control panel that fights back or support that takes days. We built FAMtastic Hosting for people who want their site online, fast, with a brand that looks like theirs — not a reseller sticker.',
      cta: 'See the difference',
      cta_url: '/hosting',
    },
    story_2: {
      title: 'Your brand on every touchpoint',
      body: 'Custom nameservers. White-label support. SSL included. From the first click to the first invoice, your customers see you — not the wholesale provider behind the curtain.',
    },
    cross_promo_designs: {
      title: 'Need a site to go with your hosting?',
      body: 'A lot of our clients came to us for hosting and left with a site they are proud of. FAMtastic Designs builds custom sites, logos, and brand packages for businesses that want to stand out.',
      cta: 'Talk to a designer',
      cta_url: 'https://famtasticdesigns.com',
    },
    cross_promo_thoughts: {
      title: 'Running a site? Learn how to grow it.',
      body: 'FAMtastic Thoughts publishes real guides on hosting, design, domains, and running a business online. No fluff. No sales pitch. Just useful answers.',
      cta: 'Read the latest',
      cta_url: 'https://famtasticthoughts.com',
    },
  },
};

function deepMergeDefaults(page: string, dbContent: PageContent): PageContent {
  const pageDefaults = DEFAULTS[page] ?? {};
  const merged: PageContent = {};

  for (const section of new Set([...Object.keys(pageDefaults), ...Object.keys(dbContent)])) {
    merged[section] = {
      ...(pageDefaults[section] ?? {}),
      ...(dbContent[section] ?? {}),
    };
  }

  return merged;
}

export async function getPageContent(page: string): Promise<PageContent> {
  try {
    const [rows] = await pool.execute<
      Array<{ section: string; key_name: string; value_text: string | null }>
    >(
      'SELECT section, key_name, value_text FROM page_content WHERE page = ? ORDER BY section ASC, key_name ASC',
      [page]
    );

    const dbContent: PageContent = {};
    for (const row of rows ?? []) {
      if (!dbContent[row.section]) dbContent[row.section] = {};
      dbContent[row.section][row.key_name] = row.value_text;
    }

    return deepMergeDefaults(page, dbContent);
  } catch (err) {
    console.error(`[getPageContent] Failed to load page=${page}:`, err);
    return DEFAULTS[page] ?? {};
  }
}

export function getSection(content: PageContent, section: string): Record<string, string | null> {
  return content[section] ?? {};
}

export function getValue(content: PageContent, section: string, key: string, fallback = ''): string {
  return content[section]?.[key] ?? fallback;
}
