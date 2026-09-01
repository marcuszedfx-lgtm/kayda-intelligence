import {
  classifyIntelligenceArticle,
  scoreIntelligenceArticle,
  scoreIntelligenceArticles,
} from './classify';

export {
  classifyIntelligenceArticle,
  scoreIntelligenceArticle,
  scoreIntelligenceArticles,
};

export function calculateIntelligenceRankingScore(
  article: Parameters<typeof scoreIntelligenceArticle>[0],
): number {
  const classification = scoreIntelligenceArticle(article).classification;

  return (
    classification.relevanceScore * 0.35 +
    classification.impactScore * 0.30 +
    classification.urgencyScore * 0.20 +
    classification.confidenceScore * 0.15
  );
}

export function rankIntelligenceArticles<
  T extends Parameters<typeof scoreIntelligenceArticles>[0][number],
>(articles: T[]) {
  return scoreIntelligenceArticles(articles).sort((a, b) => {
    const aScore =
      a.classification.relevanceScore * 0.35 +
      a.classification.impactScore * 0.30 +
      a.classification.urgencyScore * 0.20 +
      a.classification.confidenceScore * 0.15;

    const bScore =
      b.classification.relevanceScore * 0.35 +
      b.classification.impactScore * 0.30 +
      b.classification.urgencyScore * 0.20 +
      b.classification.confidenceScore * 0.15;

    if (bScore !== aScore) {
      return bScore - aScore;
    }

    if (
      b.classification.impactScore !==
      a.classification.impactScore
    ) {
      return (
        b.classification.impactScore -
        a.classification.impactScore
      );
    }

    if (
      b.classification.relevanceScore !==
      a.classification.relevanceScore
    ) {
      return (
        b.classification.relevanceScore -
        a.classification.relevanceScore
      );
    }

    if (
      b.classification.urgencyScore !==
      a.classification.urgencyScore
    ) {
      return (
        b.classification.urgencyScore -
        a.classification.urgencyScore
      );
    }

    return (
      b.classification.confidenceScore -
      a.classification.confidenceScore
    );
  });
}

// V1.5 operational decision bridge.
// Kept separate from the existing article-processing logic so the
// V1.2–V1.4 pipeline remains backward compatible.
export {
  buildOperationalDecision,
  rankDecisionQueue,
} from "./decision";
