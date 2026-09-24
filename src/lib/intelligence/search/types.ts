export type SearchProviderStatus =
  | 'available'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'temporarily_unavailable'
  | 'disabled';

export interface SearchRequest {
  query: string;
  objectiveId?: string;
  referenceIds?: string[];
  maxResults?: number;
  language?: string;
  region?: string;
  freshness?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  sourceName?: string;
  sourceType?: string;
  attributes: Record<string, unknown>;
}

export interface SearchResponse {
  providerId: string;
  results: SearchResult[];
  searchedAt: string;
  attributes: Record<string, unknown>;
}

export interface SearchProvider {
  id: string;
  name: string;

  getStatus(): Promise<SearchProviderStatus>;

  search(request: SearchRequest): Promise<SearchResponse>;
}

export interface SearchRouterOptions {
  providers: SearchProvider[];
}
