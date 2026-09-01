import {
  buildOperationalDecision,
  rankDecisionQueue,
} from "./decision";
import type {
  IntelligenceArticle,
  IntelligenceClassification,
} from "@/types/intelligence";

function makeArticle(
  id: string,
  title: string,
): IntelligenceArticle {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    summary: "Deterministic queue ranking test article.",
    publishedAt: new Date().toISOString(),
    sourceId: "queue-smoke-source",
  } as IntelligenceArticle;
}

function makeClassification(
  overrides: Partial<IntelligenceClassification> = {},
): IntelligenceClassification {
  return {
    primaryDomain: "Trade",
    secondaryDomains: ["FX"],
    relevanceScore: 90,
    impactScore: 90,
    urgencyScore: 90,
    confidenceScore: 90,
    urgency: "Immediate",
    impact: "Critical",
    whyItMatters: "Test intelligence may materially affect operations.",
    recommendedAction: "Review exposure and take appropriate action.",
    matchedSignals: ["risk", "trade", "currency"],
    ...overrides,
  };
}

const critical = buildOperationalDecision(
  makeArticle("queue-critical", "Critical operational risk"),
  makeClassification({
    relevanceScore: 95,
    impactScore: 95,
    urgencyScore: 95,
  }),
);

const high = buildOperationalDecision(
  makeArticle("queue-high", "High priority operational risk"),
  makeClassification({
    relevanceScore: 80,
    impactScore: 80,
    urgencyScore: 70,
  }),
);

const medium = buildOperationalDecision(
  makeArticle("queue-medium", "Medium priority development"),
  makeClassification({
    relevanceScore: 55,
    impactScore: 50,
    urgencyScore: 45,
    confidenceScore: 80,
  }),
);

const low = buildOperationalDecision(
  makeArticle("queue-low", "Low priority development"),
  makeClassification({
    relevanceScore: 25,
    impactScore: 20,
    urgencyScore: 10,
    confidenceScore: 60,
    primaryDomain: "Other",
    secondaryDomains: [],
    impact: "Low",
  }),
);

const ranked = rankDecisionQueue([
  medium,
  low,
  critical,
  high,
]);

if (ranked.length !== 4) {
  throw new Error(
    `Expected 4 ranked decisions, got ${ranked.length}`,
  );
}

const priorities = ranked.map((decision) => decision.priority);

const expected = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

if (JSON.stringify(priorities) !== JSON.stringify(expected)) {
  throw new Error(
    `Queue priority ranking failed. Expected ${expected.join(
      ", ",
    )}; got ${priorities.join(", ")}`,
  );
}

if (ranked[0].id !== critical.id) {
  throw new Error("Critical decision was not ranked first.");
}

if (ranked[3].id !== low.id) {
  throw new Error("Low priority decision was not ranked last.");
}

console.log("✓ Decision queue smoke test passed.");
console.log(
  JSON.stringify(
    {
      count: ranked.length,
      order: ranked.map((decision) => ({
        id: decision.id,
        priority: decision.priority,
        type: decision.decisionType,
        horizon: decision.actionHorizon,
        relevance: decision.relevanceScore,
        impact: decision.impactScore,
        urgency: decision.urgencyScore,
      })),
    },
    null,
    2,
  ),
);
