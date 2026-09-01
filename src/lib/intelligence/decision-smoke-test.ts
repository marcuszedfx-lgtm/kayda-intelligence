import type { IntelligenceClassification } from "@/types/intelligence";
import {
  buildOperationalDecision,
  rankDecisionQueue,
} from "./decision";

const article = {
  id: "smoke-001",
  title: "Regional currency volatility raises import costs",
  url: "https://example.com/smoke",
  summary: "A deterministic test article.",
  publishedAt: new Date().toISOString(),
  sourceId: "smoke-source",
} as any;

const classification: IntelligenceClassification = {
  primaryDomain: "FX",
  secondaryDomains: ["Trade", "Banking"],
  relevanceScore: 92,
  impactScore: 88,
  urgencyScore: 84,
  confidenceScore: 90,
  urgency: "High",
  impact: "High",
  whyItMatters:
    "Currency volatility may materially affect import economics.",
  recommendedAction:
    "Review current landed-cost assumptions and supplier exposure.",
  matchedSignals: [
    "currency",
    "exchange rate",
    "import",
    "risk",
  ],
};

const decision = buildOperationalDecision(article, classification);

if (!decision.id) {
  throw new Error("Decision ID missing.");
}

if (decision.priority !== "Critical") {
  throw new Error(
    `Expected Critical priority, got ${decision.priority}`,
  );
}

if (decision.decisionType !== "Risk") {
  throw new Error(
    `Expected Risk decision, got ${decision.decisionType}`,
  );
}

if (decision.actionHorizon !== "Now") {
  throw new Error(
    `Expected Now horizon, got ${decision.actionHorizon}`,
  );
}

const ranked = rankDecisionQueue([decision]);

if (ranked.length !== 1) {
  throw new Error("Decision ranking failed.");
}

console.log("✓ Operational decision smoke test passed.");

console.log(
  JSON.stringify(
    {
      priority: decision.priority,
      type: decision.decisionType,
      horizon: decision.actionHorizon,
      risk: decision.riskScore,
      opportunity: decision.opportunityScore,
      exposure: decision.operationalExposure,
    },
    null,
    2,
  ),
);
