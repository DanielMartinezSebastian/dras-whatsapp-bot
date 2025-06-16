// Comando básicos del sistema
export { PingCommand } from "./PingCommand";
export { HelpCommand } from "./HelpCommand";
export { InfoCommand } from "./InfoCommand";
export { StatusCommand } from "./StatusCommand";

import { PingCommand } from "./PingCommand";
import { HelpCommand } from "./HelpCommand";
import { InfoCommand } from "./InfoCommand";
import { StatusCommand } from "./StatusCommand";

// Export consolidado para facilitar imports
export const BasicCommands = {
  PingCommand,
  HelpCommand,
  InfoCommand,
  StatusCommand,
} as const;

// Tipos para referencia
export type BasicCommandType = keyof typeof BasicCommands;
