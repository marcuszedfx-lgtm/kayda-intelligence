import type {
  IntelligenceClassification,
  IntelligenceDomain,
  IntelligenceImpact,
  IntelligenceUrgency,
} from '@/types/intelligence';

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

type SignalRule = {
  domain: IntelligenceDomain;
  weight: number;
  terms: string[];
};

const SIGNAL_RULES: SignalRule[] = [
  {
    domain: 'FX',
    weight: 18,
    terms: [
      'forex',
      'foreign exchange',
      'exchange rate',
      'kwacha',
      'usd',
      'dollar',
      'currency',
      'fx market',
      'exchange control',
    ],
  },
  {
    domain: 'USDT',
    weight: 20,
    terms: [
      'usdt',
      'stablecoin',
      'tether',
      'crypto',
      'cryptocurrency',
      'digital asset',
      'digital currency',
    ],
  },
  {
    domain: 'Payments',
    weight: 16,
    terms: [
      'mobile money',
      'momo',
      'airtel money',
      'mtn money',
      'payments',
      'payment system',
      'remittance',
      'settlement',
    ],
  },
  {
    domain: 'Banking',
    weight: 15,
    terms: [
      'bank',
      'banks',
      'banking',
      'central bank',
      'reserve bank',
      'interest rate',
      'monetary policy',
      'liquidity',
    ],
  },
  {
    domain: 'Trade',
    weight: 14,
    terms: [
      'export',
      'import',
      'trade',
      'customs',
      'tariff',
      'shipment',
      'shipping',
      'freight',
      'logistics',
      'port',
    ],
  },
  {
    domain: 'Commodities',
    weight: 13,
    terms: [
      'commodity',
      'commodities',
      'copper',
      'oil',
      'fuel',
      'agriculture',
      'grain',
      'fertilizer',
      'raw materials',
    ],
  },
  {
    domain: 'Sugar',
    weight: 22,
    terms: [
      'sugar',
      'vhp sugar',
      'icumsA',
      'icuma',
      'refined sugar',
      'raw sugar',
      'sugar export',
      'sugar import',
    ],
  },
  {
    domain: 'Real Estate',
    weight: 12,
    terms: [
      'real estate',
      'property',
      'land',
      'housing',
      'construction',
      'commercial property',
      'residential property',
      'property market',
    ],
  },
  {
    domain: 'Technology',
    weight: 9,
    terms: [
      'technology',
      'software',
      'cloud',
      'cybersecurity',
      'automation',
      'digital transformation',
    ],
  },
  {
    domain: 'AI',
    weight: 14,
    terms: [
      'artificial intelligence',
      'ai',
      'machine learning',
      'generative ai',
      'agentic ai',
      'ai agent',
      'automation',
      'large language model',
    ],
  },
  {
    domain: 'Regulation',
    weight: 22,
    terms: [
      'regulation',
      'regulator',
      'regulatory',
      'compliance',
      'licence',
      'license',
      'law',
      'legislation',
      'policy',
      'directive',
      'ban',
      'restriction',
      'sanction',
    ],
  },
  {
    domain: 'Zambia',
    weight: 24,
    terms: [
      'zambia',
      'zambian',
      'lusaka',
      'bank of zambia',
      'zamra',
      'zra',
      'pacra',
      'government of zambia',
    ],
  },
  {
    domain: 'Africa',
    weight: 10,
    terms: [
      'africa',
      'african',
      'sadc',
      'comesa',
      'afcfta',
      'sub-saharan africa',
    ],
  },
  {
    domain: 'Global',
    weight: 5,
    terms: [
      'global',
      'world economy',
      'international markets',
      'geopolitical',
      'global markets',
    ],
  },
];

const URGENCY_TERMS = [
  'breaking',
  'immediate',
  'effective immediately',
  'today',
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
  return terms.filter((term) => text.includes(term.toLowerCase()));
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

function domainLabel(domain: IntelligenceDomain): string {
  return domain;
}

function buildWhyItMatters(
  primaryDomain: IntelligenceDomain,
  secondaryDomains: IntelligenceDomain[],
  impact: IntelligenceImpact,
  matchedSignals: string[],
): string {
  const related = secondaryDomains.length
    ? ` It also touches ${secondaryDomains.slice(0, 2).map(domainLabel).join(' and ')}.`
    : '';

  if (impact === 'Critical' || impact === 'High') {
    return `This intelligence has ${impact.toLowerCase()} potential business impact for ${domainLabel(primaryDomain)} operations and should be reviewed promptly.${related}`;
  }

  if (matchedSignals.length) {
    return `The article contains signals relevant to ${domainLabel(primaryDomain)} and may affect commercial decisions, operating conditions, or learning priorities.${related}`;
  }

  return `The article has potential strategic relevance to Kayda's operating environment and should be monitored.`;
}

function buildRecommendedAction(
  impact: IntelligenceImpact,
  urgency: IntelligenceUrgency,
  primaryDomain: IntelligenceDomain,
): string {
  if (impact === 'Critical' || urgency === 'Immediate') {
    return `Review immediately, verify the primary source, and assess exposure across ${domainLabel(primaryDomain)} operations.`;
  }

  if (impact === 'High' || urgency === 'High') {
    return `Verify the development and assess whether current procedures, pricing, counterparties, or plans need adjustment.`;
  }

  if (impact === 'Medium') {
    return `Monitor the development and determine whether it creates an opportunity, risk, or useful learning requirement.`;
  }

  return `Keep on the intelligence radar and monitor for developments that increase business relevance.`;
}

export function classifyIntelligenceArticle(
  article: ArticleLike,
): IntelligenceClassification {
  const text = normalizeText(article);

  const scoredDomains = SIGNAL_RULES
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

  const secondaryDomains = scoredDomains
    .slice(1, 4)
    .map((item) => item.domain);

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

  const relevanceScore = clamp(
    relevanceBase +
      (text.includes('zambia') ? 15 : 0) +
      (text.includes('zambian') ? 10 : 0) +
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
      (primary.domain === 'Regulation' ? 25 : 0) +
      (primary.domain === 'Zambia' ? 10 : 0),
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
