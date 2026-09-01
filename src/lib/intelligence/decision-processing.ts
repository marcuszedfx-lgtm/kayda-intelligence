import type {
  IntelligenceArticle,
  IntelligenceClassification,
  OperationalDecision,
} from "@/types/intelligence";

import {
  buildOperationalDecision,
  rankDecisionQueue,
} from "./decision";

export function processDecision(
  article: IntelligenceArticle,
  classification: IntelligenceClassification,
): OperationalDecision {
  return buildOperationalDecision(article, classification);
}

export function processDecisionQueue(
  items: Array<{
    article: IntelligenceArticle;
    classification: IntelligenceClassification;
  }>,
): OperationalDecision[] {
  const decisions = items.map(({ article, classification }) =>
    processDecision(article, classification),
  );

  return rankDecisionQueue(decisions);
}
