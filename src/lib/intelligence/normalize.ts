import type { IntelligenceArticle } from '@/types/intelligence';

export interface RawIntelligenceArticle {
  externalId?: string;
  title: string;
  summary?: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  topics?: string[];
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function fallbackExternalId(article: RawIntelligenceArticle): string {
  return `${article.publisher}:${article.title}:${article.url}`
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function normalizeArticle(
  raw: RawIntelligenceArticle,
  feedId?: string,
  sourceId?: string,
): IntelligenceArticle {
  const now = new Date().toISOString();

  return {
    id: `article-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    externalId: raw.externalId || fallbackExternalId(raw),
    title: cleanText(raw.title),
    summary: cleanText(raw.summary || ''),
    url: raw.url.trim(),
    publisher: cleanText(raw.publisher),
    publishedAt: raw.publishedAt || now,
    discoveredAt: now,
    sourceId,
    feedId,
    topics: raw.topics || [],
    processed: false,
  };
}

export function deduplicateArticles(
  articles: IntelligenceArticle[],
): IntelligenceArticle[] {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const key = article.externalId || article.url;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
