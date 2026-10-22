import type {
  IntelligenceArticle,
  IntelligenceClassification,
  OperationalDecision,
  DecisionPriority,
  DecisionType,
  ActionHorizon,
  IntelligenceDomain,
} from "@/types/intelligence";

import {
  LEARNING_DOMAINS,
  MARKET_DOMAINS,
  OPERATIONAL_DOMAINS,
} from "./taxonomy";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function priorityFromScore(score: number): DecisionPriority {
  if (score >= 85) return "Critical";
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function horizonFromScore(
  urgency: number,
  priority: DecisionPriority,
): ActionHorizon {
  if (priority === "Critical") return "Now";
  if (urgency >= 75) return "Today";
  if (urgency >= 45) return "This Week";
  return "Monitor";
}

function decisionType(
  risk: number,
  opportunity: number,
  operational: number,
  market: number,
  learning: number,
): DecisionType {
  const candidates: Array<[DecisionType, number]> = [
    ["Risk", risk],
    ["Opportunity", opportunity],
    ["Operational", operational],
    ["Market", market],
    ["Learning", learning],
  ];

  candidates.sort((a, b) => b[1] - a[1]);

  if (candidates[0][1] < 35) return "Monitor";

  return candidates[0][0];
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/**
 * V1.5 derives its operational signals from the canonical V1.4
 * classification contract.
 *
 * We deliberately do NOT maintain duplicate fields such as
 * `businessDomains` or `signalType`. The classification engine
 * already provides the authoritative domain and signal evidence.
 */
function getDomains(
  classification: IntelligenceClassification,
): IntelligenceDomain[] {
  return unique([
    classification.primaryDomain,
    ...classification.secondaryDomains,
  ]);
}

function hasAnyDomain(
  domains: IntelligenceDomain[],
  targets: IntelligenceDomain[],
): boolean {
  return domains.some((domain) => targets.includes(domain));
}

function inferSignalType(
  classification: IntelligenceClassification,
): "Risk" | "Opportunity" | "Neutral" {
  const signalText = classification.matchedSignals
    .join(" ")
    .toLowerCase();

  const riskTerms = [
    "risk",
    "warning",
    "ban",
    "banned",
    "restriction",
    "restricted",
    "sanction",
    "sanctions",
    "regulation",
    "regulatory",
    "compliance",
    "crisis",
    "disruption",
    "shortage",
    "devaluation",
    "deadline",
  ];

  const opportunityTerms = [
    "opportunity",
    "growth",
    "expansion",
    "investment",
    "partnership",
    "export",
    "demand",
    "recovery",
    "increase",
    "surge",
    "opening",
  ];

  const riskMatches = riskTerms.filter((term) =>
    signalText.includes(term),
  ).length;

  const opportunityMatches = opportunityTerms.filter((term) =>
    signalText.includes(term),
  ).length;

  if (riskMatches > opportunityMatches && riskMatches > 0) {
    return "Risk";
  }

  if (opportunityMatches > riskMatches && opportunityMatches > 0) {
    return "Opportunity";
  }

  if (classification.impact === "Critical" || classification.impact === "High") {
    return "Risk";
  }

  return "Neutral";
}

export function buildOperationalDecision(
  article: IntelligenceArticle,
  classification: IntelligenceClassification,
): OperationalDecision {
  const relevance = clamp(classification.relevanceScore);
  const impact = clamp(classification.impactScore);
  const urgency = clamp(classification.urgencyScore);
  const confidence = clamp(classification.confidenceScore);

  const domains = getDomains(classification);
  const signalType = inferSignalType(classification);

  const market = hasAnyDomain(
    domains,
    [...MARKET_DOMAINS],
  )
    ? 75
    : 20;

  const operational = hasAnyDomain(
    domains,
    [...OPERATIONAL_DOMAINS],
  )
    ? 80
    : 20;

  const risk = clamp(
    impact * 0.45 +
      urgency * 0.25 +
      (100 - confidence) * 0.1 +
      (signalType === "Risk" ? 30 : 0),
  );

  const opportunity = clamp(
    relevance * 0.3 +
      impact * 0.3 +
      confidence * 0.2 +
      (signalType === "Opportunity" ? 35 : 0),
  );

  const learning = hasAnyDomain(
    domains,
    [...LEARNING_DOMAINS],
  )
    ? 75
    : 15;

  const exposure = clamp(
    impact * 0.4 +
      relevance * 0.3 +
      operational * 0.2 +
      market * 0.1,
  );

  const composite = clamp(
    relevance * 0.25 +
      impact * 0.25 +
      urgency * 0.2 +
      confidence * 0.1 +
      exposure * 0.2,
  );

  const priority = priorityFromScore(composite);
  const horizon = horizonFromScore(urgency, priority);

  const type = decisionType(
    risk,
    opportunity,
    operational,
    market,
    learning,
  );

  const whyItMatters =
    classification.whyItMatters ||
    `This intelligence may affect ${domains.join(", ")}.`;

  const recommendedAction =
    classification.recommendedAction ||
    "Monitor the development and assess its operational impact.";

  const decisionSummary =
    `${type} decision: ${whyItMatters} ` +
    `Recommended action: ${recommendedAction}`;

  return {
    id: `decision-${article.id}`,
    articleId: article.id,
    title: article.title,
    decisionType: type,
    priority,
    actionHorizon: horizon,
    relevanceScore: relevance,
    impactScore: impact,
    urgencyScore: urgency,
    confidenceScore: confidence,
    operationalExposure: exposure,
    opportunityScore: opportunity,
    riskScore: risk,
    affectedDomains: domains,
    whyItMatters,
    recommendedAction,
    decisionSummary,
    createdAt: new Date().toISOString(),
  };
}

export function rankDecisionQueue(
  decisions: OperationalDecision[],
): OperationalDecision[] {
  return [...decisions].sort((a, b) => {
    const priorityWeight: Record<DecisionPriority, number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    const priorityDifference =
      priorityWeight[b.priority] -
      priorityWeight[a.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return (
      b.relevanceScore +
      b.impactScore +
      b.urgencyScore
    ) -
      (
        a.relevanceScore +
        a.impactScore +
        a.urgencyScore
      );
  });
}
