import type {
  IntelligenceSource,
  IntelligenceSignal,
  LearningTopic,
  LearningResource,
  SignalLearningLink,
} from '@/types/intelligence';

export const intelligenceSources: IntelligenceSource[] = [
  {
    id: 'source-zambia-sugar',
    name: 'Zambia Sugar',
    sourceType: 'Company',
    publisher: 'Zambia Sugar',
    credibility: 90,
    active: true,
    websiteUrl: 'https://www.zamsugar.com/',
  },
  {
    id: 'source-broad-market',
    name: 'Regional Commodity Market',
    sourceType: 'Industry',
    publisher: 'Industry Intelligence',
    credibility: 78,
    active: true,
  },
  {
    id: 'source-zambian-regulatory',
    name: 'Zambian Regulatory Environment',
    sourceType: 'Regulator',
    publisher: 'Regulatory Intelligence',
    credibility: 85,
    active: true,
  },
];

export const learningTopics: LearningTopic[] = [
  {
    id: 'learning-commodity-procurement',
    name: 'Commodity Procurement',
    description:
      'Supplier negotiation, pricing, availability assessment and procurement strategy.',
    category: 'Commercial',
    priority: 'High',
    relevanceScore: 94,
    status: 'Recommended',
  },
  {
    id: 'learning-trade-documentation',
    name: 'International Trade Documentation',
    description:
      'Core documentation, transaction controls and commercial requirements for cross-border trade.',
    category: 'Trade',
    priority: 'High',
    relevanceScore: 91,
    status: 'Recommended',
  },
  {
    id: 'learning-market-intelligence',
    name: 'Market Intelligence',
    description:
      'How to identify, evaluate and act on market signals before they become obvious.',
    category: 'Intelligence',
    priority: 'Normal',
    relevanceScore: 88,
    status: 'Recommended',
  },
];

export const learningResources: LearningResource[] = [
  {
    id: 'resource-commodity-basics',
    title: 'Commodity Procurement Fundamentals',
    provider: 'Kayda Learning',
    resourceType: 'Internal lesson',
    difficulty: 'Intermediate',
    estimatedMins: 30,
    topicId: 'learning-commodity-procurement',
  },
  {
    id: 'resource-trade-docs',
    title: 'International Trade Documentation',
    provider: 'Kayda Learning',
    resourceType: 'Study module',
    difficulty: 'Intermediate',
    estimatedMins: 45,
    topicId: 'learning-trade-documentation',
  },
  {
    id: 'resource-market-signals',
    title: 'Reading Market Signals',
    provider: 'Kayda Learning',
    resourceType: 'Internal lesson',
    difficulty: 'Intermediate',
    estimatedMins: 25,
    topicId: 'learning-market-intelligence',
  },
];

export const intelligenceSignals: IntelligenceSignal[] = [
  {
    id: 'signal-sugar-pricing',
    title: 'Sugar pricing and availability require confirmation',
    summary:
      'The current VHP sugar opportunity remains dependent on confirmed supplier pricing and availability.',
    signalType: 'Commercial',
    importance: 'High',
    relevanceScore: 97,
    confidenceScore: 86,
    status: 'New',
    detectedAt: 'Today · 09:25',
    sourceId: 'source-zambia-sugar',
    businessId: 'kayda-group',
    dealId: 'sugar',
    whyItMatters:
      'Supplier confirmation establishes the commercial baseline needed before downstream buyer pricing is finalised.',
    recommendedAction:
      'Confirm the latest quotation, available volume and validity period before responding to the buyer.',
    learningTopicIds: [
      'learning-commodity-procurement',
      'learning-trade-documentation',
    ],
  },
  {
    id: 'signal-property-terms',
    title: 'Payment structure remains the key Plot B9 risk',
    summary:
      'The Plot B9 opportunity has meaningful value, but transaction structure remains the main issue requiring attention.',
    signalType: 'Property',
    importance: 'Medium',
    relevanceScore: 89,
    confidenceScore: 82,
    status: 'Reviewed',
    detectedAt: 'Yesterday · 17:10',
    businessId: 'urbankey',
    dealId: 'plot-b9',
    whyItMatters:
      'A strong headline offer does not necessarily translate into a secure transaction without acceptable payment terms.',
    recommendedAction:
      'Review the proposed payment structure and identify protections before accepting or countering.',
    learningTopicIds: ['learning-market-intelligence'],
  },
  {
    id: 'signal-regulatory-watch',
    title: 'Regulatory monitoring should remain active',
    summary:
      'Kayda should maintain a dedicated watch for regulatory developments that could affect commercial and digital operations.',
    signalType: 'Regulatory',
    importance: 'Medium',
    relevanceScore: 84,
    confidenceScore: 74,
    status: 'New',
    detectedAt: 'Today · 08:45',
    businessId: 'kayda-group',
    whyItMatters:
      'Regulatory changes can affect transaction structures, operating costs and permissible workflows.',
    recommendedAction:
      'Establish a recurring regulatory intelligence review and connect material signals to affected businesses.',
    learningTopicIds: ['learning-market-intelligence'],
  },
];

export const signalLearningLinks: SignalLearningLink[] = [
  {
    signalId: 'signal-sugar-pricing',
    learningTopicId: 'learning-commodity-procurement',
    reason: 'Directly relevant to the active VHP sugar opportunity.',
  },
  {
    signalId: 'signal-sugar-pricing',
    learningTopicId: 'learning-trade-documentation',
    reason: 'Supports safer execution of the underlying commercial transaction.',
  },
  {
    signalId: 'signal-property-terms',
    learningTopicId: 'learning-market-intelligence',
    reason: 'Improves interpretation of commercial opportunity and transaction risk.',
  },
  {
    signalId: 'signal-regulatory-watch',
    learningTopicId: 'learning-market-intelligence',
    reason: 'Builds the skill required to identify meaningful regulatory signals.',
  },
];
