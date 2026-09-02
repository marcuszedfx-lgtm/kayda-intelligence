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
 * The application previously stored intelligence feeds
 * directly in this file.
 *
 * Step 5A moves the actual source definitions into the
 * Source Registry.
 *
 * This compatibility layer remains so the existing
 * ingestion engine continues to work without requiring a
 * dangerous rewrite of the working live adapter system.
 *
 * Future steps will replace this compatibility layer with
 * database-backed source/company relationships.
 * =========================================================
 */

export const intelligenceFeeds: IntelligenceFeed[] =
  getRegisteredIntelligenceFeeds();

export function getActiveIntelligenceFeeds(): IntelligenceFeed[] {
  return intelligenceFeeds.filter(
    (feed) => feed.active && feed.status === 'Active',
  );
}

export function getIntelligenceSources() {
  return getRegisteredSources();
}
