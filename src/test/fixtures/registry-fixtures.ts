import type { KaydaRegistry } from '@/lib/intelligence/registry-store';

/**
 * =========================================================
 * ISOLATED TEST FIXTURE — RUNTIME REGISTRY
 * =========================================================
 *
 * Generic placeholder organisations and sources used ONLY
 * by automated tests. Nothing in application runtime ever
 * imports this file. The entities below deliberately do not
 * correspond to any real organisation.
 * =========================================================
 */

export const fixtureRegistry: KaydaRegistry = {
  sources: [
    {
      id: 'source-fixture-wire',
      name: 'Fixture Wire Service',
      sourceType: 'News',
      publisher: 'Fixture Publisher',
      credibility: 70,
      active: true,
      websiteUrl: 'https://wire.example.com/',
      feedUrl: 'https://wire.example.com/feed.xml',
      feedType: 'RSS',
      tags: ['fixture', 'general news'],
      domains: ['Business', 'Trade'],
    },
    {
      id: 'source-fixture-regulator',
      name: 'Fixture Regulatory Bulletin',
      sourceType: 'Regulator',
      publisher: 'Fixture Authority',
      credibility: 90,
      active: true,
      websiteUrl: 'https://regulator.example.gov/',
      feedUrl: 'https://regulator.example.gov/api/posts',
      feedType: 'API',
      tags: ['fixture', 'regulation'],
      domains: ['Regulation', 'Trade'],
    },
    {
      id: 'source-fixture-inactive',
      name: 'Fixture Inactive Feed',
      sourceType: 'Industry',
      publisher: 'Fixture Publisher',
      credibility: 40,
      active: false,
      websiteUrl: 'https://inactive.example.com/',
      feedType: 'Manual',
      tags: ['fixture'],
      domains: ['Other'],
    },
  ],

  companies: [
    {
      id: 'company-fixture-manufacturer',
      name: 'Fixture Manufacturing Ltd',
      shortName: 'Fixture Manufacturing',
      description: 'A generic manufacturing company used in tests.',
      country: 'Exampleland',
      city: 'Example City',
      industry: 'Manufacturing',
      sector: 'Consumer Goods',
      status: 'Monitoring',
      websiteUrl: 'https://manufacturer.example.com/',
      importance: 'High',
      roles: ['Supplier', 'Market Participant'],
    },
    {
      id: 'company-fixture-authority',
      name: 'Fixture Trade Authority',
      shortName: 'FTA',
      description: 'A generic regulatory authority used in tests.',
      country: 'Exampleland',
      industry: 'Government',
      sector: 'Trade Regulation',
      status: 'Monitoring',
      importance: 'Critical',
      roles: ['Regulator', 'Government Entity'],
    },
    {
      id: 'company-fixture-archived',
      name: 'Fixture Archived Company',
      country: 'Exampleland',
      industry: 'Manufacturing',
      status: 'Archived',
      importance: 'Low',
      roles: ['Other'],
    },
  ],

  companyProfiles: [
    {
      companyId: 'company-fixture-manufacturer',
      monitoringEnabled: true,
      relevanceScore: 85,
      riskLevel: 'Medium',
      domains: ['Commodities', 'Trade', 'Manufacturing'],
      keywords: [
        'fixture manufacturing',
        'widget production',
        'assembly output',
      ],
      countries: ['Exampleland'],
      commodities: ['Widgets', 'Components'],
    },
    {
      companyId: 'company-fixture-authority',
      monitoringEnabled: true,
      relevanceScore: 95,
      riskLevel: 'High',
      domains: ['Regulation', 'Trade', 'Compliance'],
      keywords: [
        'fixture trade authority',
        'customs duty',
        'import licensing',
        'compliance',
      ],
      countries: ['Exampleland'],
      commodities: ['General Trade'],
    },
    {
      companyId: 'company-fixture-archived',
      monitoringEnabled: false,
      relevanceScore: 10,
      domains: ['Other'],
      keywords: ['archived fixture'],
      countries: ['Exampleland'],
      commodities: [],
    },
  ],

  companySourceRelationships: [
    {
      id: 'rel-fixture-manufacturer-wire',
      companyId: 'company-fixture-manufacturer',
      sourceId: 'source-fixture-wire',
      active: true,
      relevance: 'General coverage of manufacturing activity.',
    },
    {
      id: 'rel-fixture-authority-regulator',
      companyId: 'company-fixture-authority',
      sourceId: 'source-fixture-regulator',
      active: true,
      relevance: 'Primary regulatory bulletins.',
    },
    {
      id: 'rel-fixture-manufacturer-regulator',
      companyId: 'company-fixture-manufacturer',
      sourceId: 'source-fixture-regulator',
      active: true,
      relevance: 'Regulatory changes affecting manufacturing trade.',
    },
  ],
};
