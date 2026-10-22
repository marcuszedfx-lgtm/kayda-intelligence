export type AIProviderConfig = {
  id: string;
  name: string;
  apiKeyEnv: string;
  modelEnv: string;
  baseUrlEnv?: string;
  defaultBaseUrl?: string;
  capabilities: readonly (
    | 'structured_extraction'
    | 'reasoning'
    | 'synthesis'
  )[];
  enabledByDefault: boolean;
  costClass: 'free_tier' | 'optional_paid';
};

export type SearchProviderConfig = {
  id: string;
  name: string;
  apiKeyEnv: string;
  enabledByDefault: boolean;
  costClass: 'free_tier';
};

export const AI_PROVIDER_CONFIGS: readonly AIProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    // Gemini exposes an OpenAI-compatible surface at this path.
    defaultBaseUrl: [
      'https://',
      'generativelanguage.googleapis.com',
      '/v1beta/openai',
    ].join(''),
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: true,
    costClass: 'free_tier',
  },
  {
    id: 'qwen',
    name: 'Alibaba Qwen',
    apiKeyEnv: 'QWEN_API_KEY',
    modelEnv: 'QWEN_MODEL',
    baseUrlEnv: 'QWEN_BASE_URL',
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: true,
    costClass: 'free_tier',
  },
  {
    id: 'groq',
    name: 'Groq',
    apiKeyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    defaultBaseUrl: [
      'https://',
      'api.groq.com',
      '/openai/v1',
    ].join(''),
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: true,
    costClass: 'free_tier',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    modelEnv: 'CEREBRAS_MODEL',
    defaultBaseUrl: [
      'https://',
      'api.cerebras.ai',
      '/v1',
    ].join(''),
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: true,
    costClass: 'free_tier',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    apiKeyEnv: 'MISTRAL_API_KEY',
    modelEnv: 'MISTRAL_MODEL',
    defaultBaseUrl: [
      'https://',
      'api.mistral.ai',
      '/v1',
    ].join(''),
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: true,
    costClass: 'free_tier',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultBaseUrl: [
      'https://',
      'api.openai.com',
      '/v1',
    ].join(''),
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: true,
    costClass: 'optional_paid',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    defaultBaseUrl: [
      'https://',
      'api.anthropic.com',
    ].join(''),
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: true,
    costClass: 'optional_paid',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultBaseUrl: [
      'https://',
      'api.deepseek.com',
    ].join(''),
    capabilities: [
      'structured_extraction',
      'reasoning',
      'synthesis',
    ],
    enabledByDefault: false,
    costClass: 'optional_paid',
  },
];

export const SEARCH_PROVIDER_CONFIGS: readonly SearchProviderConfig[] = [
  {
    id: 'brave',
    name: 'Brave Search',
    apiKeyEnv: 'BRAVE_SEARCH_API_KEY',
    enabledByDefault: true,
    costClass: 'free_tier',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    apiKeyEnv: 'TAVILY_API_KEY',
    enabledByDefault: true,
    costClass: 'free_tier',
  },
];

export function isEnvConfigured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function getConfiguredAIProviders(): AIProviderConfig[] {
  return AI_PROVIDER_CONFIGS.filter((provider) => {
    if (!provider.enabledByDefault && provider.id !== 'deepseek') {
      return false;
    }

    return (
      isEnvConfigured(provider.apiKeyEnv) &&
      isEnvConfigured(provider.modelEnv)
    );
  });
}

export function getConfiguredSearchProviders(): SearchProviderConfig[] {
  return SEARCH_PROVIDER_CONFIGS.filter((provider) =>
    isEnvConfigured(provider.apiKeyEnv),
  );
}
