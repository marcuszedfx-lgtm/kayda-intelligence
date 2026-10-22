export type IntelligenceSourceType =
  | 'Company'
  | 'Industry'
  | 'Regulator'
  | 'Government'
  | 'News'
  | 'Research'
  | 'Market';

export type IntelligenceSignalType =
  | 'Commercial'
  | 'Market'
  | 'Commodity'
  | 'Property'
  | 'Technology'
  | 'AI'
  | 'Finance'
  | 'Regulatory';

export type IntelligenceImportance =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low';

export type IntelligenceSignalStatus =
  | 'New'
  | 'Reviewed'
  | 'Monitoring'
  | 'Actionable'
  | 'Archived';

export type LearningPriority =
  | 'Critical'
  | 'High'
  | 'Normal'
  | 'Low';

export type LearningTopicStatus =
  | 'Recommended'
  | 'In Progress'
  | 'Completed'
  | 'Archived';

export type LearningResourceType =
  | 'Internal lesson'
  | 'Study module'
  | 'Article'
  | 'Report'
  | 'Course'
  | 'Video'
  | 'Documentation';

export type LearningDifficulty =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced';

export interface IntelligenceSource {
  id: string;
  name: string;
  sourceType: IntelligenceSourceType;
  publisher: string;
  credibility: number;
  active: boolean;
  feedUrl?: string;
  websiteUrl?: string;
}


export interface IntelligenceFeed extends IntelligenceSource {
  url: string;
  feedUrl?: string;
  feedType: 'RSS' | 'Atom' | 'API' | 'Manual';
  sourceId: string;
  status: 'Active' | 'Paused' | 'Error';
}

export interface LearningTopic {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: LearningPriority;
  relevanceScore: number;
  status: LearningTopicStatus;
}

export interface LearningResource {
  id: string;
  title: string;
  provider: string;
  resourceType: LearningResourceType;
  difficulty: LearningDifficulty;
  estimatedMins: number;
  topicId: string;
}


export interface IntelligenceSignal {
  id: string;
  title: string;
  summary: string;
  signalType: IntelligenceSignalType;
  importance: IntelligenceImportance;
  relevanceScore: number;
  confidenceScore: number;
  status: IntelligenceSignalStatus;
  detectedAt: string;
  sourceId?: string;
  businessId?: string;
  dealId?: string;
  projectId?: string;
  whyItMatters: string;
  recommendedAction: string;
  learningTopicIds: string[];
}

export interface SignalLearningLink {
  signalId: string;
  learningTopicId: string;
  reason: string;
}


export type IntelligenceFeedType =
  | 'RSS'
  | 'API'
  | 'Web'
  | 'Manual';

export type IntelligenceIngestionStatus =
  | 'Active'
  | 'Paused'
  | 'Error';



export interface IntelligenceArticle {
  id: string;
  externalId: string;
  title: string;
  summary: string;
  url: string;
  publisher: string;
  publishedAt: string;
  discoveredAt: string;
  sourceId?: string;
  feedId?: string;
  topics: string[];
  processed: boolean;
}

export interface IntelligenceIngestionRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'Running' | 'Completed' | 'Failed';
  feedsChecked: number;
  articlesDiscovered: number;
  articlesAdded: number;
  signalsGenerated: number;
  errorMessage?: string;
}


/* =========================================================
   KAYDA INTELLIGENCE V1.4
   CLASSIFICATION + RELEVANCE TYPES
   ========================================================= */

export type IntelligenceDomain =
  | 'FX'
  | 'USDT'
  | 'Payments'
  | 'Banking'
  | 'Trade'
  | 'Commodities'
  | 'Real Estate'
  | 'Technology'
  | 'AI'
  | 'Regulation'
  | 'Africa'
  | 'Global'
  | 'Business'
  | 'Learning'
  | 'Other';

export type IntelligenceUrgency =
  | 'Immediate'
  | 'High'
  | 'Normal'
  | 'Low';

export type IntelligenceImpact =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Informational';

export interface IntelligenceClassification {
  primaryDomain: IntelligenceDomain;
  secondaryDomains: IntelligenceDomain[];
  relevanceScore: number;
  urgencyScore: number;
  impactScore: number;
  confidenceScore: number;
  urgency: IntelligenceUrgency;
  impact: IntelligenceImpact;
  whyItMatters: string;
  recommendedAction: string;
  matchedSignals: string[];

  /**
   * Geographic terms detected in the article (country or
   * region names). Context only: geography is never the
   * primary classification.
   */
  geographyContext?: string[];
}

export interface ScoredIntelligenceArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  sourceName: string;
  classification: IntelligenceClassification;
}

// ==================================================
// V1.5 — OPERATIONAL DECISION INTELLIGENCE
// ==================================================

export type DecisionType =
  | "Risk"
  | "Opportunity"
  | "Operational"
  | "Market"
  | "Learning"
  | "Monitor";

export type ActionHorizon =
  | "Now"
  | "Today"
  | "This Week"
  | "Monitor";

export type DecisionPriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low";

export interface OperationalDecision {
  id: string;
  articleId: string;
  title: string;
  decisionType: DecisionType;
  priority: DecisionPriority;
  actionHorizon: ActionHorizon;
  relevanceScore: number;
  impactScore: number;
  urgencyScore: number;
  confidenceScore: number;
  operationalExposure: number;
  opportunityScore: number;
  riskScore: number;
  affectedDomains: string[];
  whyItMatters: string;
  recommendedAction: string;
  decisionSummary: string;
  createdAt: string;
}

export interface DecisionQueueItem {
  decision: OperationalDecision;
  rank: number;
}
