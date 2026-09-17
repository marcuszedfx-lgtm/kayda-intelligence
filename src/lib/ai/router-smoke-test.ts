import { AIRouter } from "./router";

import type {
  AIProvider,
  AIRequest,
  AIResponse,
} from "./types";

const request: AIRequest = {
  capability: "reasoning",
  systemPrompt: "Test system prompt",
  userPrompt: "Test router failover",
};

const failingProvider: AIProvider = {
  id: "provider-a",
  name: "Test Provider A",
  models: ["test-model-a"],
  capabilities: ["reasoning"],

  async getStatus() {
    return "quota_exhausted";
  },

  async complete(_request): Promise<AIResponse> {
    throw new Error("Provider A should not be called");
  },
};

const workingProvider: AIProvider = {
  id: "provider-b",
  name: "Test Provider B",
  models: ["test-model-b"],
  capabilities: ["reasoning"],

  async getStatus() {
    return "available";
  },

  async complete(_request): Promise<AIResponse> {
    return {
      providerId: "provider-b",
      modelId: "test-model-b",
      content: "Failover succeeded.",
    };
  },
};

async function main() {
  const router = new AIRouter({
    providers: [failingProvider, workingProvider],
  });

  const response = await router.complete(request);

  if (response.providerId !== "provider-b") {
    throw new Error(
      `Expected provider-b, received ${response.providerId}`,
    );
  }

  console.log("✓ AI router failover smoke test passed.");
  console.log(`  Selected provider: ${response.providerId}`);
  console.log(`  Selected model: ${response.modelId}`);
  console.log(`  Response: ${response.content}`);
}

main().catch((error) => {
  console.error("✗ AI router failover smoke test failed.");
  console.error(error);
  process.exit(1);
});
