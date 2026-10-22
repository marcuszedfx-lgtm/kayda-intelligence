import type {
  IntelligenceClassification,
  IntelligenceDomain,
  IntelligenceImpact,
  IntelligenceUrgency,
} from '@/types/intelligence';

import {
  getGeographicContextTerms,
  TOPICAL_DOMAIN_RULES,
} from './taxonomy';

type ArticleLike = {
  id?: string;
  title?: string;
  summary?: string;
  description?: string;
  content?: string;
  url?: string;
  publishedAt?: string;
  sourceName?: string;
};

const URGENCY_TERMS = [
  'breaking',
  'immediate',
  'effective immediately',
  'urgent',
  'emergency',
  'suspends',
  'suspended',
  'bans',
  'ban',
  'deadline',
  'effective',
  'new rule',
  'new regulation',
];

const HIGH_IMPACT_TERMS = [
  'ban',
  'banned',
  'restriction',
  'restricted',
  'sanction',
  'sanctions',
  'regulation',
  'regulatory',
  'compliance',
  'tax',
  'tariff',
  'interest rate',
  'exchange control',
  'devaluation',
  'currency crisis',
  'capital control',
  'liquidity crisis',
  'supply disruption',
];

const ACTION_TERMS = [
  'opportunity',
  'investment',
  'acquisition',
  'partnership',
  'contract',
  'tender',
  'export',
  'import',
  'price increase',
  'price decrease',
  'shortage',
  'surplus',
];

function normalizeText(article: ArticleLike): string {
  return [
    article.title,
    article.summary,
    article.description,
    article.content,
    article.sourceName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function countMatches(text: string, terms: string[]): string[] {
  return terms.filter((term) => {
    const escapedTerm = term
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const pattern = new RegExp(
      `(?<![a-z0-9])${escapedTerm}(?![a-z0-9])`,
      'i',
    );

    return pattern.test(text);
  });
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function urgencyFromScore(score: number): IntelligenceUrgency {
  if (score >= 75) return 'Immediate';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Normal';
  return 'Low';
}

function impactFromScore(score: number): IntelligenceImpact {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Informational';
}

function buildWhyItMatters(
  primaryDomain: IntelligenceDomain,
  secondaryDomains: IntelligenceDomain[],
  impact: IntelligenceImpact,
  matchedSignals: string[],
): string {
  const related = secondaryDomains.length
    ? ` It also touches ${secondaryDomains.slice(0, 2).join(' and ')}.`
    : '';

  if (impact === 'Critical' || impact === 'High') {
    return `This intelligence has ${impact.toLowerCase()} potential business impact for ${primaryDomain} operations and should be reviewed promptly.${related}`;
  }

  if (matchedSignals.length) {
    return `The article contains signals relevant to ${primaryDomain} and may affect commercial decisions, operating conditions, or learning priorities.${related}`;
  }

  return `The article has potential strategic relevance to your operating environment and should be monitored.`;
}

function buildRecommendedAction(
  impact: IntelligenceImpact,
  urgency: IntelligenceUrgency,
  primaryDomain: IntelligenceDomain,
): string {
  if (impact === 'Critical' || urgency === 'Immediate') {
    return `Review immediately, verify the primary source, and assess exposure across ${primaryDomain} operations.`;
  }

  if (impact === 'High' || urgency === 'High') {
    return `Verify the development and assess whether current procedures, pricing, counterparties, or plans need adjustment.`;
  }

  if (impact === 'Medium') {
    return `Monitor the development and determine whether it creates an opportunity, risk, or useful learning requirement.`;
  }

  return `Keep on the intelligence radar and monitor for developments that increase business relevance.`;
}

/**
 * Detects geographic context terms (continents and every ISO
 * 3166 country name). Geography is CONTEXT ONLY: it is never
 * eligible to become the primary classification.
 */
function detectGeography(text: string): string[] {
  return getGeographicContextTerms()
    .filter((term) => {
      const escapedTerm = term
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const pattern = new RegExp(
        `(?<![a-z0-9])${escapedTerm}(?![a-z0-9])`,
        'i',
      );

      return pattern.test(text);
    })
    .slice(0, 8);
}

export function classifyIntelligenceArticle(
  article: ArticleLike,
): IntelligenceClassification {
  const text = normalizeText(article);

  const scoredDomains = TOPICAL_DOMAIN_RULES
    .map((rule) => {
      const matches = countMatches(text, rule.terms);
      return {
        domain: rule.domain,
        score: matches.length * rule.weight,
        matches,
      };
    })
    .filter((item) => item.matches.length > 0)
    .sort((a, b) => b.score - a.score);

  const primary = scoredDomains[0] ?? {
    domain: 'Other' as IntelligenceDomain,
    score: 0,
    matches: [],
  };

  const geography = detectGeography(text);

  const secondaryDomains = scoredDomains
    .slice(1, 4)
    .map((item) => item.domain);

  if (
    geography.some((term) =>
      ['africa', 'african'].includes(term),
    ) &&
    !secondaryDomains.includes('Africa')
  ) {
    secondaryDomains.push('Africa');
  }

  if (
    geography.some((term) =>
      ['global', 'worldwide', 'international'].includes(term),
    ) &&
    !secondaryDomains.includes('Global')
  ) {
    secondaryDomains.push('Global');
  }

  const matchedSignals = Array.from(
    new Set(
      scoredDomains.flatMap((item) =>
        item.matches.map((match) => match),
      ),
    ),
  ).slice(0, 12);

  const relevanceBase = scoredDomains.reduce(
    (total, item) => total + item.score,
    0,
  );

  // Relevance derives from topical evidence only. Geographic
  // mentions deliberately add nothing: being about a place is
  // not the same as being relevant.
  const relevanceScore = clamp(
    relevanceBase +
      (text.includes('business') ? 5 : 0),
  );

  const urgencyMatches = countMatches(text, URGENCY_TERMS);

  const urgencyScore = clamp(
    urgencyMatches.length * 18 +
      (text.includes('today') ? 20 : 0) +
      (text.includes('effective immediately') ? 30 : 0),
  );

  const impactMatches = countMatches(text, HIGH_IMPACT_TERMS);

  const impactScore = clamp(
    impactMatches.length * 18 +
      (primary.score >= 40 ? 20 : 0) +
      (primary.domain === 'Regulation' ? 25 : 0),
  );

  const actionMatches = countMatches(text, ACTION_TERMS);

  const confidenceScore = clamp(
    45 +
      Math.min(25, scoredDomains.length * 8) +
      Math.min(20, matchedSignals.length * 3) +
      (article.title ? 5 : 0) +
      (article.summary || article.description ? 5 : 0),
  );

  const urgency = urgencyFromScore(urgencyScore);
  const impact = impactFromScore(impactScore);

  return {
    primaryDomain: primary.domain,
    secondaryDomains,
    relevanceScore,
    urgencyScore,
    impactScore,
    confidenceScore,
    urgency,
    impact,
    whyItMatters: buildWhyItMatters(
      primary.domain,
      secondaryDomains,
      impact,
      matchedSignals,
    ),
    recommendedAction: buildRecommendedAction(
      impact,
      urgency,
      primary.domain,
    ),
    matchedSignals: [
      ...matchedSignals,
      ...actionMatches.slice(0, 4).map((item) => `action:${item}`),
    ].slice(0, 16),
    ...(geography.length
      ? { geographyContext: geography }
      : {}),
  };
}

export function scoreIntelligenceArticle(article: ArticleLike) {
  return {
    ...article,
    classification: classifyIntelligenceArticle(article),
  };
}

export function scoreIntelligenceArticles(articles: ArticleLike[]) {
  return articles.map(scoreIntelligenceArticle);
}
