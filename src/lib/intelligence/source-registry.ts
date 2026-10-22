import type {
  IntelligenceFeed,
  IntelligenceSource,
  IntelligenceSourceType,
} from '@/types/intelligence';

import {
  loadRegistry,
  type KaydaRegistry,
} from './registry-store';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — SOURCE REGISTRY (FACADE)
 * =========================================================
 *
 * The registry of intelligence sources is USER-OWNED
 * RUNTIME CONFIGURATION loaded from data/kayda-registry.json
 * (see registry-store.ts). This module no longer embeds any
 * source definitions: Kayda starts with zero sources, and a
 * new source is added by editing the registry file (or the
 * future database-backed equivalent) — never by editing
 * source code.
 *
 * A source is NOT the same thing as a company:
 *
 * - A company is an external organisation Kayda monitors.
 * - A source is an origin of intelligence (site, feed, API).
 * - One source can inform many companies; one company can
 *   rely on many sources.
 * =========================================================
 */

export interface RegisteredIntelligenceSource {
  id: string;
  name: string;
  sourceType: IntelligenceSourceType;
  publisher: string;
  credibility: number;
  active: boolean;

  /**
   * Canonical website.
   */
  websiteUrl: string;

  /**
   * Optional machine-readable feed.
   */
  feedUrl?: string;

  /**
   * How Kayda should retrieve information.
   */
  feedType: 'RSS' | 'Atom' | 'API' | 'Manual';

  /**
   * Optional descriptive tags.
   */
  tags: string[];

  /**
   * Domains this source is especially relevant to.
   */
  domains: string[];
}

/**
 * =========================================================
 * REGISTRY HELPERS
 *
 * Every helper accepts an optional registry for tests and
 * callers that already loaded one. Without one, the
 * user-owned registry file is loaded.
 * =========================================================
 */

export function getRegisteredSources(
  registry: KaydaRegistry = loadRegistry().registry,
): RegisteredIntelligenceSource[] {
  return registry.sources.filter((source) => source.active);
}

export function getRegisteredSourceById(
  sourceId: string,
  registry: KaydaRegistry = loadRegistry().registry,
): RegisteredIntelligenceSource | undefined {
  return registry.sources.find(
    (source) => source.id === sourceId,
  );
}

export function searchRegisteredSources(
  query: string,
  registry: KaydaRegistry = loadRegistry().registry,
): RegisteredIntelligenceSource[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return getRegisteredSources(registry);
  }

  return getRegisteredSources(registry).filter((source) => {
    const searchableText = [
      source.id,
      source.name,
      source.publisher,
      source.sourceType,
      source.websiteUrl,
      ...source.tags,
      ...source.domains,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

/**
 * Convert a registry source into the legacy
 * IntelligenceSource structure.
 */
export function registeredSourceToIntelligenceSource(
  source: RegisteredIntelligenceSource,
): IntelligenceSource {
  return {
    id: source.id,
    name: source.name,
    sourceType: source.sourceType,
    publisher: source.publisher,
    credibility: source.credibility,
    active: source.active,
    feedUrl: source.feedUrl,
    websiteUrl: source.websiteUrl,
  };
}

/**
 * Convert a registry source into the legacy
 * IntelligenceFeed structure.
 */
export function registeredSourceToFeed(
  source: RegisteredIntelligenceSource,
): IntelligenceFeed {
  return {
    id: `feed-${source.id.replace(/^source-/, '')}`,
    name: source.name,
    sourceType: source.sourceType,
    publisher: source.publisher,
    credibility: source.credibility,
    active: source.active,
    url: source.websiteUrl,
    feedUrl: source.feedUrl,
    feedType: source.feedType,
    sourceId: source.id,
    status: 'Active',
  };
}

/**
 * Return the feed representation expected by the live
 * ingestion layer.
 */
export function getRegisteredIntelligenceFeeds(
  registry: KaydaRegistry = loadRegistry().registry,
): IntelligenceFeed[] {
  return getRegisteredSources(registry).map(
    registeredSourceToFeed,
  );
}
