/** Predefined discovery topics — analysis maps transcript against these labels. */
export const DISCOVERY_TOPICS = [
  "Budget Discussion",
  "Competitor Comparison",
  "Kitchen Size / Scope",
  "Cabinet Style Preference",
  "Remodeling Full Kitchen?",
  "Timeline & Milestones",
  "Decision Makers",
] as const;

export type DiscoveryTopic = (typeof DISCOVERY_TOPICS)[number];
