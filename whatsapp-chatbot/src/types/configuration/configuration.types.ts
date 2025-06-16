/**
 * Tipos para el sistema de configuración centralizada
 */

// Configuración general del bot
export interface BotConfiguration {
  bot: BotSettings;
  messages: MessageTemplates;
  behavior: BehaviorSettings;
  system: SystemSettings;
}

export interface BotSettings {
  name: string;
  prefix: string;
  autoReply: boolean;
  commandPrefix: string;
  useNewCommandSystem: boolean;
  maxDailyResponses: number;
  minResponseInterval: number;
  version: string;
  environment: "development" | "production" | "testing";
}

export interface BehaviorSettings {
  cooldowns: Record<string, number>;
  permissions: PermissionSettings;
  rateLimits: RateLimitSettings;
  features: FeatureToggles;
}

export interface PermissionSettings {
  strictMode: boolean;
  defaultRole: UserRole;
  adminOverride: boolean;
  commandPermissions: Record<string, UserRole[]>;
}

export interface RateLimitSettings {
  maxMessagesPerMinute: number;
  maxCommandsPerHour: number;
  cooldownViolationPenalty: number;
  blacklistDuration: number;
}

export interface FeatureToggles {
  contextualResponses: boolean;
  helpAutoPrompt: boolean;
  nameRegistration: boolean;
  debugMode: boolean;
  analyticsTracking: boolean;
}

export interface SystemSettings {
  logging: LoggingSettings;
  database: DatabaseSettings;
  monitoring: MonitoringSettings;
}

export interface LoggingSettings {
  level: "debug" | "info" | "warn" | "error";
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  maxLogFiles: number;
  maxLogSize: string;
}

export interface DatabaseSettings {
  path: string;
  backupInterval: number;
  maxBackups: number;
  autoVacuum: boolean;
}

export interface MonitoringSettings {
  healthCheckInterval: number;
  metricsCollection: boolean;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxErrorRate: number;
  maxResponseTime: number;
}

// Plantillas de mensajes
export interface MessageTemplates {
  greetings: GreetingTemplates;
  farewells: FarewellTemplates;
  questions: QuestionTemplates;
  commands: CommandTemplates;
  errors: ErrorTemplates;
  system: SystemTemplates;
  help: HelpTemplates;
  responses: ResponseTemplates;
  contextual?: ContextualTemplates;
}

export interface GreetingTemplates {
  new: string[];
  returning: string[];
  timeBasedGreetings: Record<TimeOfDay, string>;
}

export interface FarewellTemplates {
  general: string[];
  frequent: string[];
  night: string[];
  timeBasedFarewells: Record<TimeOfDay, string>;
}

export interface QuestionTemplates {
  what: string[];
  how: string[];
  when: string[];
  where: string[];
  why: string[];
  who: string[];
  default: string[];
}

export interface CommandTemplates {
  help: CommandHelpTemplates;
  descriptions: Record<string, string>;
  syntaxExamples: Record<string, string[]>;
  permissionMessages: Record<string, string>;
}

export interface CommandHelpTemplates {
  general: HelpSectionTemplate;
  basic: HelpSectionTemplate;
  user: HelpSectionTemplate;
  admin: HelpSectionTemplate;
  system: HelpSectionTemplate;
}

export interface HelpSectionTemplate {
  title: string;
  subtitle?: string;
  footer?: string;
  commands: Record<string, string>;
}

export interface ErrorTemplates {
  general: Record<string, string>;
  validation: Record<string, string>;
  system: Record<string, string>;
  commands: Record<string, string>;
  permissions: Record<string, string>;
}

export interface SystemTemplates {
  status: Record<string, string>;
  actions: Record<string, string>;
  info: SystemInfoTemplates;
  notifications: Record<string, string>;
}

export interface SystemInfoTemplates {
  botVersion: string;
  systemArchitecture: string;
  features: string[];
  supportInfo: string;
}

export interface HelpTemplates {
  general: string[];
  commandSpecific: Record<string, string>;
  noPermission: string[];
  commandNotFound: string[];
}

export interface ResponseTemplates {
  default: string[];
  thinking: string[];
  acknowledgment: string[];
  clarification: string[];
}

export interface ContextualTemplates {
  greeting_new: string[];
  greeting_returning: string[];
  farewell_general: string[];
  farewell_frequent: string[];
  farewell_night: string[];
  help_request: string[];
  help_prompt: string[];
  question_default: string[];
  bot_questions: {
    what_can_you_do: string[];
    how_it_works: string[];
  };
  default: string[];
  registration: {
    name_request: string[];
    name_confirmed: string[];
    name_changed: string[];
  };
  [key: string]: any; // Para permitir categorías dinámicas
}

// Tipos auxiliares
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type UserRole =
  | "guest"
  | "user"
  | "friend"
  | "employee"
  | "admin"
  | "system";
export type MessageCategory = keyof MessageTemplates;
export type ConfigurationSection = keyof BotConfiguration;

// Resultado de validación
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  value: any;
  expectedType?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Evento de cambio de configuración
export interface ConfigurationChangeEvent {
  timestamp: Date;
  section: ConfigurationSection;
  path: string;
  oldValue: any;
  newValue: any;
  source: "command" | "file" | "api" | "system";
  user?: string;
}

// Opciones de reemplazo para plantillas
export interface TemplateReplacements {
  userName?: string;
  timeOfDay?: TimeOfDay;
  timeOfDayGreeting?: string;
  command?: string;
  syntax?: string;
  field?: string;
  action?: string;
  value?: any;
  error?: string;
  [key: string]: any;
}

// Configuración del proveedor de mensajes
export interface MessageProviderConfig {
  defaultLanguage: string;
  fallbackToDefault: boolean;
  cacheMessages: boolean;
  reloadOnChange: boolean;
  validationEnabled: boolean;
}

// Configuración del gestor de configuración
export interface ConfigurationManagerConfig {
  configPath: string;
  backupPath: string;
  watchForChanges: boolean;
  autoSave: boolean;
  validationEnabled: boolean;
  maxBackups: number;
}

// Opciones de exportación/importación
export interface ExportOptions {
  sections?: ConfigurationSection[];
  includeDefaults: boolean;
  format: "json" | "yaml" | "toml";
  prettify: boolean;
}

export interface ImportOptions {
  merge: boolean;
  validate: boolean;
  backup: boolean;
  dryRun: boolean;
}
