export interface CommandRegistryEntry {
  command: any; // Will be properly typed when ICommand interface is created
  lastExecuted?: Date;
  executionCount: number;
  enabled: boolean;
}

export interface CommandStats {
  totalCommands: number;
  enabledCommands: number;
  disabledCommands: number;
  mostUsedCommand?: string;
  leastUsedCommand?: string;
}
