import type { IntelligenceSource } from '@/types/intelligence';

export interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  sourceId: string;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(xml: string, name: string): string {
  const match = xml.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'),
  );

  return match ? decodeEntities(match[1]) : '';
}

function parseItems(xml: string, sourceId: string): RawFeedItem[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];

  return items.map((item) => ({
    title: tag(item, 'title'),
    link: tag(item, 'link'),
    description: tag(item, 'description'),
    publishedAt:
      tag(item, 'pubDate') ||
      tag(item, 'published') ||
      tag(item, 'updated'),
    sourceId,
  })).filter((item) => item.title && item.link);
}

export async function fetchRssFeed(
  source: IntelligenceSource & { feedUrl?: string },
): Promise<RawFeedItem[]> {
  if (!source.feedUrl) {
    return [];
  }

  const response = await fetch(source.feedUrl, {
    headers: {
      'User-Agent': 'Kayda-Intelligence/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `RSS fetch failed for ${source.name}: ${response.status} ${response.statusText}`,
    );
  }

  const xml = await response.text();

  return parseItems(xml, source.id);
}
