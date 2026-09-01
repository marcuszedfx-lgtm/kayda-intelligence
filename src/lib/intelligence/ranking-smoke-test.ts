import { rankIntelligenceArticles } from "./processing";

const articles = [
  {
    id: "rank-001",
    title: "Zambia introduces immediate foreign exchange restriction",
    summary:
      "A new exchange control measure takes effect immediately and may affect importers.",
    url: "https://example.com/fx",
    publishedAt: new Date().toISOString(),
    sourceId: "test",
  },

  {
    id: "rank-002",
    title: "Global AI company releases new developer tool",
    summary:
      "A major technology company releases a new artificial intelligence development platform.",
    url: "https://example.com/ai",
    publishedAt: new Date().toISOString(),
    sourceId: "test",
  },

  {
    id: "rank-003",
    title: "Zambia sugar export demand increases",
    summary:
      "Regional demand for sugar increases, creating potential export opportunities.",
    url: "https://example.com/sugar",
    publishedAt: new Date().toISOString(),
    sourceId: "test",
  },

  {
    id: "rank-004",
    title: "Local property market remains stable",
    summary:
      "Property activity remains broadly stable with no major regulatory changes.",
    url: "https://example.com/property",
    publishedAt: new Date().toISOString(),
    sourceId: "test",
  },
];

const ranked = rankIntelligenceArticles(articles);

console.log("");
console.log("==================================================");
console.log(" KAYDA INTELLIGENCE V1.5 — ARTICLE RANKING TEST");
console.log("==================================================");
console.log("");

ranked.forEach((article, index) => {
  const c = article.classification;

  const rankingScore =
    c.relevanceScore * 0.35 +
    c.impactScore * 0.30 +
    c.urgencyScore * 0.20 +
    c.confidenceScore * 0.15;

  console.log(`${index + 1}. ${article.title}`);
  console.log(`   Domain: ${c.primaryDomain}`);
  console.log(`   Relevance: ${c.relevanceScore}`);
  console.log(`   Impact: ${c.impactScore}`);
  console.log(`   Urgency: ${c.urgencyScore}`);
  console.log(`   Confidence: ${c.confidenceScore}`);
  console.log(`   Ranking Score: ${Math.round(rankingScore)}`);
  console.log("");
});

if (ranked.length !== articles.length) {
  throw new Error("Ranking returned an incorrect number of articles.");
}

if (!ranked[0]) {
  throw new Error("Ranking returned no articles.");
}

const calculatedScores = ranked.map((article) => {
  const c = article.classification;

  return (
    c.relevanceScore * 0.35 +
    c.impactScore * 0.30 +
    c.urgencyScore * 0.20 +
    c.confidenceScore * 0.15
  );
});

for (let i = 1; i < calculatedScores.length; i++) {
  if (calculatedScores[i] > calculatedScores[i - 1]) {
    throw new Error(
      `Ranking order is incorrect: article ${i + 1} has a higher score than article ${i}.`,
    );
  }
}

console.log("✓ Multi-article ranking smoke test passed.");
console.log("✓ Ranking order matches composite ranking score.");
