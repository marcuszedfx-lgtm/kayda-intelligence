export type AIProviderStatus =
  | "available"
  | "rate_limited"
  | "quota_exhausted"
  | "temporarily_unavailable"
  | "disabled";

export type AICapability =
  | "structured_extraction"
  | "reasoning"
  | "synthesis";

export interface AIRequest {
  capability: AICapability;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIResponse {
  providerId: string;
  modelId: string;
  content: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  models: string[];
  capabilities: AICapability[];

  getStatus(): Promise<AIProviderStatus>;

  complete(request: AIRequest): Promise<AIResponse>;
}

export interface AIRouterOptions {
  providers: AIProvider[];
}
