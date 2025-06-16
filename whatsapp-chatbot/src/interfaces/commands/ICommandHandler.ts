import { WhatsAppMessage, User } from "../../types/core";
import { CommandResult } from "../../types/commands";

export interface ICommandHandler {
  handleCommand(message: WhatsAppMessage, user: User): Promise<CommandResult>;
  parseCommand(
    message: WhatsAppMessage
  ): { command: string; args: string[] } | null;
  canExecuteCommand(commandName: string, user: User): boolean;
}
