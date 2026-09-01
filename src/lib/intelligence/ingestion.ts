import type {
  IntelligenceArticle,
  IntelligenceFeed,
  IntelligenceIngestionRun,
} from '@/types/intelligence';
import {
  getActiveIntelligenceFeeds,
} from '@/lib/intelligence/feeds';
import {
  deduplicateArticles,
} from '@/lib/intelligence/normalize';

export interface IntelligenceConnector {
  fetch(feed: IntelligenceFeed): Promise<IntelligenceArticle[]>;
}

/**
 * Safe V1.3 connector.
 *
 * It intentionally does not make external requests yet.
 * This lets the application establish a stable ingestion
 * contract before live providers are connected.
 */
export class EmptyConnector implements IntelligenceConnector {
  async fetch(_feed: IntelligenceFeed): Promise<IntelligenceArticle[]> {
    return [];
  }
}

export interface IngestionResult {
  run: IntelligenceIngestionRun;
  articles: IntelligenceArticle[];
}

export async function runIntelligenceIngestion(
  connector: IntelligenceConnector = new EmptyConnector(),
): Promise<IngestionResult> {
  const startedAt = new Date().toISOString();
  const feeds = getActiveIntelligenceFeeds();

  let discovered: IntelligenceArticle[] = [];
  let feedsChecked = 0;

  for (const feed of feeds) {
    feedsChecked += 1;

    const articles = await connector.fetch(feed);
    discovered = discovered.concat(articles);
  }

  const articles = deduplicateArticles(discovered);
  const completedAt = new Date().toISOString();

  return {
    run: {
      id: `ingestion-${Date.now()}`,
      startedAt,
      completedAt,
      status: 'Completed',
      feedsChecked,
      articlesDiscovered: discovered.length,
      articlesAdded: articles.length,
      signalsGenerated: 0,
    },
    articles,
  };
}
