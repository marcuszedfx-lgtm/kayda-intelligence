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

export function rankIntelligenceArticles<
  T extends Parameters<typeof scoreIntelligenceArticles>[0][number],
>(articles: T[]) {
  return scoreIntelligenceArticles(articles)
    .sort(
      (a, b) =>
        b.classification.relevanceScore -
        a.classification.relevanceScore,
    )
    .sort(
      (a, b) =>
        b.classification.impactScore -
        a.classification.impactScore,
    );
}
