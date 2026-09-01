export interface AgentResponse {
  recommendation: string;
  summary: string;
  why: string;
  risk: string;
  nextAction: string;
  related: string[];
}

export function getDemoAgentResponse(input: string): AgentResponse {
  const q = input.toLowerCase();
  if (q.includes('deal') || q.includes('pipeline')) {
    return {
      recommendation: 'Protect the two live commercial opportunities with the highest near-term value.',
      summary: 'The VHP supply deal is the strongest opportunity, while Plot B9 requires a terms review before momentum is lost.',
      why: 'One deal is waiting on supplier information and the other is in active negotiation. Both have clear next actions.',
      risk: 'Unresolved pricing or payment terms can weaken downstream negotiations.',
      nextAction: 'Open the VHP deal first, then review Plot B9 terms.',
      related: ['VHP Sugar Supply', 'Ibex Meanwood Plot B9', 'Ngosa Chibale'],
    };
  }
  if (q.includes('waiting') || q.includes('follow')) {
    return {
      recommendation: 'Follow up with Ngosa Chibale first.',
      summary: 'The supplier quotation is the highest-leverage outstanding response in the current operating picture.',
      why: 'Confirming availability and pricing unlocks the next buyer-facing action.',
      risk: 'A delayed quotation can create pricing uncertainty and slow the transaction.',
      nextAction: 'Send or approve the VHP quotation follow-up.',
      related: ['Ngosa Chibale', 'VHP Sugar Supply'],
    };
  }
  return {
    recommendation: 'Resolve the VHP quotation information gap first.',
    summary: 'It is the clearest blocker to a downstream commercial decision today.',
    why: 'The supplier response establishes the pricing and availability baseline needed to move safely.',
    risk: 'Proceeding before confirmation could expose the transaction to avoidable pricing risk.',
    nextAction: 'Confirm quotation and availability with Zambia Sugar.',
    related: ['VHP Sugar Supply', 'Zambia Sugar', 'Follow-up · Today'],
  };
}
