import { ICommand } from "./ICommand";
import {
  CommandRegistryEntry,
  CommandRegistryOptions,
  CommandSearchOptions,
  CommandRegistryStats,
  CommandCategory,
} from "../../types/commands";

export interface ICommandRegistry {
  register(command: ICommand): boolean;
  get(commandNameOrAlias: string): ICommand | null;
  search(options: CommandSearchOptions): ICommand[];
  getAll(): ICommand[];
  getByCategory(category: CommandCategory): ICommand[];
  getCategories(): CommandCategory[];
  enable(commandName: string): boolean;
  disable(commandName: string): boolean;
  loadCommands(): number;
  reloadCommands(): number;
  getStats(): CommandRegistryStats;
}
