import { intelligenceFeeds } from './feeds';
import { fetchRssFeed, type RawFeedItem } from './rss';

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
}

function hash(value: string): string {
  let result = 0;

  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }

  return Math.abs(result).toString(36);
}

function normalize(item: RawFeedItem): NormalizedLiveArticle {
  const source = intelligenceFeeds.find((feed) => feed.id === item.sourceId);

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
  };
}

export async function ingestLiveIntelligence(): Promise<{
  articles: NormalizedLiveArticle[];
  feedsChecked: number;
  feedErrors: string[];
}> {
  const activeFeeds = intelligenceFeeds.filter((feed) => feed.active);

  const results = await Promise.allSettled(
    activeFeeds.map((feed) => fetchRssFeed(feed)),
  );

  const articles: NormalizedLiveArticle[] = [];
  const feedErrors: string[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      articles.push(...result.value.map(normalize));
    } else {
      feedErrors.push(
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
      );
    }
  });

  const unique = new Map<string, NormalizedLiveArticle>();

  for (const article of articles) {
    const key = article.url || article.title.toLowerCase();
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
    feedErrors,
  };
}
