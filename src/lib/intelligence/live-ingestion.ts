import { getActiveIntelligenceFeeds } from './feeds';
import type { IntelligenceFeed } from '@/types/intelligence';
import {
  ingestFromSource,
  type AdapterArticle,
} from './source-adapters';

export interface NormalizedLiveArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  credibility: number;
  ingestionMethod: string;
}

function hash(value: string): string {
  let result = 0;

  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }

  return Math.abs(result).toString(36);
}

function normalize(
  item: AdapterArticle,
  ingestionMethod: string,
  feeds: IntelligenceFeed[],
): NormalizedLiveArticle {
  const source = feeds.find(
    (feed) => feed.id === item.sourceId,
  );

  const cleanSummary =
    item.description ||
    'No summary was supplied by the source. Open the original article for the full context.';

  return {
    id: `live-${hash(`${item.link}|${item.title}`)}`,
    title: item.title.trim(),
    summary: cleanSummary.trim().slice(0, 500),
    url: item.link.trim(),
    publishedAt: item.publishedAt || new Date().toISOString(),
    sourceId: item.sourceId,
    sourceName: source?.name ?? 'Unknown source',
    sourceType: source?.sourceType ?? 'News',
    credibility: source?.credibility ?? 50,
    ingestionMethod,
  };
}

export async function ingestLiveIntelligence(): Promise<{
  articles: NormalizedLiveArticle[];
  feedsChecked: number;
  successfulFeeds: number;
  emptyFeeds: number;
  protectedFeeds: number;
  failedFeeds: number;
  feedErrors: string[];
}> {
  const activeFeeds = getActiveIntelligenceFeeds();

  const results = await Promise.all(
    activeFeeds.map(async (feed) => ({
      feed,
      result: await ingestFromSource(feed),
    })),
  );

  const articles: NormalizedLiveArticle[] = [];
  const feedErrors: string[] = [];

  let successfulFeeds = 0;
  let emptyFeeds = 0;
  let protectedFeeds = 0;
  let failedFeeds = 0;

  for (const { result } of results) {
    if (result.status === 'success') {
      successfulFeeds += 1;
    } else if (result.status === 'empty') {
      emptyFeeds += 1;
    } else if (result.status === 'protected') {
      protectedFeeds += 1;
    } else {
      failedFeeds += 1;
    }

    if (result.error) {
      feedErrors.push(result.error);
    }

    articles.push(
      ...result.articles.map((article) =>
        normalize(article, result.method, activeFeeds),
      ),
    );
  }

  const unique = new Map<string, NormalizedLiveArticle>();

  for (const article of articles) {
    const key =
      article.url ||
      `${article.sourceId}:${article.title.toLowerCase()}`;

    if (!unique.has(key)) {
      unique.set(key, article);
    }
  }

  return {
    articles: Array.from(unique.values()).sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime(),
    ),
    feedsChecked: activeFeeds.length,
    successfulFeeds,
    emptyFeeds,
    protectedFeeds,
    failedFeeds,
    feedErrors,
  };
}
