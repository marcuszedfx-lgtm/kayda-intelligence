import {
  getCompanyIntelligenceContext,
} from './company-intelligence-context';
import { getRegisteredCompanies } from './company-registry';
import type { KaydaRegistry } from './registry-store';

export interface CompanyRelevanceInput {
  companyId: string;
  title: string;
  summary?: string;
  content?: string;
  sourceId?: string;
}

export interface CompanyRelevanceResult {
  companyId: string;
  companyName: string;
  matched: boolean;
  score: number;
  matchedKeywords: string[];
  matchedDomains: string[];
  confidence: number;
  reason: string;
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function countKeywordMatches(
  text: string,
  keywords: string[],
): string[] {
  return keywords.filter((keyword: string) => {
    const normalizedKeyword = normalize(keyword);

    if (!normalizedKeyword) {
      return false;
    }

    return text.includes(normalizedKeyword);
  });
}

export function evaluateCompanyRelevance(
  input: CompanyRelevanceInput,
  registry?: KaydaRegistry,
): CompanyRelevanceResult {
  const context = getCompanyIntelligenceContext(
    input.companyId,
    registry,
  );

  if (!context) {
    return {
      companyId: input.companyId,
      companyName: 'Unknown company',
      matched: false,
      score: 0,
      matchedKeywords: [],
      matchedDomains: [],
      confidence: 0,
      reason: 'No registered company intelligence context found.',
    };
  }

  if (
    input.sourceId &&
    !context.sourceIds.includes(input.sourceId)
  ) {
    return {
      companyId: input.companyId,
      companyName: context.company.name,
      matched: false,
      score: 0,
      matchedKeywords: [],
      matchedDomains: [],
      confidence: 0.2,
      reason: 'The source is not currently linked to this company.',
    };
  }

  const text = normalize(
    [
      input.title,
      input.summary ?? '',
      input.content ?? '',
    ].join(' '),
  );

  const keywords = context.profile.keywords
    .map((keyword: string) => normalize(keyword))
    .filter(Boolean);

  const matchedKeywords = countKeywordMatches(text, keywords);

  const matchedDomains = context.profile.domains.filter(
    (domain: string) => text.includes(normalize(domain)),
  );

  const keywordScore = Math.min(
    70,
    matchedKeywords.length * 20,
  );

  const domainScore = Math.min(
    20,
    matchedDomains.length * 10,
  );

  const companyBaseline = Math.min(
    10,
    Math.max(0, context.profile.relevanceScore / 10),
  );

  const score = Math.min(
    100,
    Math.round(keywordScore + domainScore + companyBaseline),
  );

  const matched =
    matchedKeywords.length > 0 ||
    matchedDomains.length > 0;

  const confidence = matched
    ? Math.min(
        1,
        0.5 +
          matchedKeywords.length * 0.1 +
          matchedDomains.length * 0.05,
      )
    : 0.1;

  let reason = 'No company-specific terms were detected.';

  if (matched) {
    const reasons: string[] = [];

    if (matchedKeywords.length > 0) {
      reasons.push(
        `${matchedKeywords.length} company keyword match${
          matchedKeywords.length === 1 ? '' : 'es'
        }`,
      );
    }

    if (matchedDomains.length > 0) {
      reasons.push(
        `${matchedDomains.length} domain match${
          matchedDomains.length === 1 ? '' : 'es'
        }`,
      );
    }

    reason = reasons.join(' and ');
  }

  return {
    companyId: input.companyId,
    companyName: context.company.name,
    matched,
    score,
    matchedKeywords,
    matchedDomains,
    confidence,
    reason,
  };
}

export function evaluateAllRegisteredCompanies(
  input: Omit<CompanyRelevanceInput, 'companyId'>,
  registry?: KaydaRegistry,
): CompanyRelevanceResult[] {
  return getRegisteredCompanies(registry)
    .map((company) =>
      evaluateCompanyRelevance(
        {
          ...input,
          companyId: company.id,
        },
        registry,
      ),
    )
    .filter((result: CompanyRelevanceResult) => result.matched)
    .sort((a, b) => b.score - a.score);
}
