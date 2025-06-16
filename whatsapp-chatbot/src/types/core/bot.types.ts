export interface BotConfiguration {
  botName: string;
  botPrefix: string;
  autoReply: boolean;
  commandPrefix: string;
  useNewCommandSystem: boolean;
  maxDailyResponses: number;
  minResponseInterval: number;
}

export interface BotStats {
  startTime: Date;
  uptime: number;
  messagesProcessed: number;
  commandsExecuted: number;
  errorsCount: number;
  ready: boolean;
}

export interface ProcessorStats {
  totalMessages: number;
  totalCommands: number;
  totalErrors: number;
  successfulInteractions: number;
  startTime: Date;
}
