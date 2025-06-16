import {
  CommandMetadata,
  CommandContext,
  CommandResult,
  CommandValidation,
} from "../../types/commands";
import { User } from "../../types/core/user.types";

export interface ICommand {
  readonly metadata: CommandMetadata;
  execute(context: CommandContext): Promise<CommandResult>;
  validate(context: CommandContext): CommandValidation;
  canExecute(user: User): boolean;
  getHelp(): string;
  getUsageExamples(): string[];
}
