export interface RequestObservation {
  accountId: string;
  status?: number;
  timing: {
    agentPreparationMs?: number;
    headersMs?: number;
    firstContentMs?: number;
    lastContentMs?: number;
    completedMs?: number;
    contentEvents: number;
  };
}

export interface LiveObservation {
  requests: RequestObservation[];
  payloads: number;
  toolExecutions: number;
  continuationHasToolResult: boolean;
}
