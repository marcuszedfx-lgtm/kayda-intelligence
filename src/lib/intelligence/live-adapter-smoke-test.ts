import type { IntelligenceFeed } from '@/types/intelligence';
import { ingestFromSource } from './source-adapters';

/**
 * =========================================================
 * MANUAL LIVE ADAPTER CHECK (network required)
 * =========================================================
 *
 * This script performs REAL outbound requests and is
 * therefore excluded from `npm test`. It contains no
 * built-in source list: you provide the URL explicitly.
 *
 * Usage:
 *   npx tsx src/lib/intelligence/live-adapter-smoke-test.ts \
 *     <url> [RSS|Atom|API|Manual]
 * =========================================================
 */

function parseArgs(): IntelligenceFeed {
  const [, , urlArg, feedTypeArg] = process.argv;

  if (!urlArg) {
    console.error(
      'Usage: npx tsx src/lib/intelligence/live-adapter-smoke-test.ts <url> [RSS|Atom|API|Manual]',
    );
    process.exit(2);
  }

  let parsed: URL;

  try {
    parsed = new URL(urlArg);
  } catch {
    console.error(`Invalid URL: ${urlArg}`);
    process.exit(2);
  }

  if (parsed.protocol !== 'https:') {
    console.error('Only https:// URLs are permitted.');
    process.exit(2);
  }

  const feedType =
    feedTypeArg === 'RSS' ||
    feedTypeArg === 'Atom' ||
    feedTypeArg === 'API'
      ? feedTypeArg
      : 'Manual';

  return {
    id: 'manual-live-check',
    name: `Manual live check (${parsed.hostname})`,
    sourceType: 'News',
    publisher: parsed.hostname,
    credibility: 50,
    active: true,
    url: parsed.toString(),
    feedType,
    sourceId: 'manual-live-check',
    status: 'Active',
  };
}

async function main() {
  const feed = parseArgs();

  console.log('==================================================');
  console.log(' KAYDA INTELLIGENCE — MANUAL LIVE ADAPTER CHECK');
  console.log('==================================================');
  console.log('');
  console.log(`URL:    ${feed.url}`);
  console.log(`TYPE:   ${feed.feedType}`);
  console.log('');

  const started = Date.now();

  try {
    const result = await ingestFromSource(feed);

    console.log(`METHOD:    ${result.method}`);
    console.log(`STATUS:    ${result.status}`);
    console.log(`ARTICLES:  ${result.articles.length}`);
    console.log(`TIME:      ${Date.now() - started}ms`);

    if (result.error) {
      console.log(`ERROR:     ${result.error}`);
    }

    if (result.articles.length > 0) {
      console.log('');
      console.log('FIRST ARTICLE:');

      const article = result.articles[0];

      console.log(`  Title: ${article.title}`);
      console.log(`  Link:  ${article.link}`);
      console.log(`  Date:  ${article.publishedAt}`);
    }

    if (result.status === 'error') {
      process.exitCode = 1;
    }
  } catch (error) {
    console.log('STATUS:    exception');
    console.log(
      `ERROR:     ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  }

  console.log('');
  console.log('==================================================');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
