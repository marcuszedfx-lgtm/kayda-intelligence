/**
 * Command Agent responses.
 *
 * Kayda does not fabricate analysis. Until an AI provider is
 * configured and the agent is connected to the intelligence
 * engine, every response is an explicit, honest statement of
 * status rather than a canned answer.
 */

export interface AgentResponse {
  recommendation: string;
  summary: string;
  why: string;
  risk: string;
  nextAction: string;
  related: string[];
}

/**
 * Returns the honest response used while no AI provider is
 * connected. The `input` is accepted so call sites keep a
 * stable signature; it is not used to invent an answer.
 */
export function getAgentStatusResponse(
  input: string,
): AgentResponse {
  void input;

  return {
    recommendation:
      'The Command Agent is not connected to an AI provider yet.',
    summary:
      'No intelligence provider is configured in this environment, so Kayda has no grounded analysis to offer for your request. Nothing has been invented to fill the gap.',
    why:
      'An ungrounded answer would be indistinguishable from a real finding, which is exactly what this system is designed to avoid.',
    risk:
      'Acting on fabricated analysis is riskier than acting on none. Kayda will only respond once a provider is configured and can ground its answer in retrieved evidence.',
    nextAction:
      'Configure an AI provider (see .env.example and /api/status), then connect the agent to the intelligence engine.',
    related: [],
  };
}
