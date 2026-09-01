import type { IntelligenceFeed } from '@/types/intelligence';

export const intelligenceFeeds: IntelligenceFeed[] = [
  {
    id: 'feed-zambia-sugar-news',
    name: 'Zambia Sugar Intelligence Feed',
    sourceType: 'News',
    publisher: 'Zambia Sugar',
    credibility: 90,
    active: true,
    url: 'https://www.zamsugar.com/',
    feedUrl: 'https://www.zamsugar.com/',
    feedType: 'RSS',
    sourceId: 'source-zambia-sugar',
    status: 'Active',
  },
  {
    id: 'feed-zambia-business-news',
    name: 'Zambia Business News',
    sourceType: 'News',
    publisher: 'Zambian Business Intelligence',
    credibility: 82,
    active: true,
    url: 'https://www.lusakatimes.com/',
    feedUrl: 'https://www.lusakatimes.com/',
    feedType: 'RSS',
    sourceId: 'source-broad-market',
    status: 'Active',
  },
  {
    id: 'feed-zambia-regulatory',
    name: 'Zambian Regulatory Intelligence',
    sourceType: 'News',
    publisher: 'Zambian Regulatory Intelligence',
    credibility: 85,
    active: true,
    url: 'https://www.zra.org.zm/',
    feedUrl: 'https://www.zra.org.zm/',
    feedType: 'RSS',
    sourceId: 'source-zambian-regulatory',
    status: 'Active',
  },
];

export function getActiveIntelligenceFeeds(): IntelligenceFeed[] {
  return intelligenceFeeds.filter((feed) => feed.status === 'Active');
}
