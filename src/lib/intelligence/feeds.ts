import type { IntelligenceFeed } from '@/types/intelligence';

import {
  getRegisteredIntelligenceFeeds,
  getRegisteredSources,
} from './source-registry';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — FEED COMPATIBILITY LAYER
 * =========================================================
 *
 * Thin adapters between the user-owned source registry
 * (data/kayda-registry.json) and the live ingestion layer,
 * which still expects the legacy IntelligenceFeed shape.
 *
 * The registry is read on every call so configuration
 * changes take effect without a restart. With an empty
 * registry these return empty lists — an honest state, not
 * an error.
 * =========================================================
 */

export function getIntelligenceFeeds(): IntelligenceFeed[] {
  return getRegisteredIntelligenceFeeds();
}

export function getActiveIntelligenceFeeds(): IntelligenceFeed[] {
  return getIntelligenceFeeds().filter(
    (feed) => feed.active && feed.status === 'Active',
  );
}

export function getIntelligenceSources() {
  return getRegisteredSources();
}
