import { intelligenceFeeds } from './feeds';
import { ingestFromSource } from './source-adapters';

async function main() {
  console.log('==================================================');
  console.log(' KAYDA INTELLIGENCE V1.5 — LIVE ADAPTER SMOKE TEST');
  console.log('==================================================');
  console.log('');

  for (const feed of intelligenceFeeds.filter(
    (item) => item.active && item.status === 'Active',
  )) {
    console.log(`SOURCE: ${feed.name}`);
    console.log(`TYPE:   ${feed.feedType}`);
    console.log(`URL:    ${feed.url}`);
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
    } catch (error) {
      console.log('STATUS:    exception');
      console.log(
        `ERROR:     ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    console.log('');
    console.log('--------------------------------------------------');
    console.log('');
  }

  console.log('==================================================');
  console.log(' END LIVE ADAPTER SMOKE TEST');
  console.log('==================================================');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
