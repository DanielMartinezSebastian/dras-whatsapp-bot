import type {
  CommandMetadata,
  CommandContext,
  CommandResult,
} from "../../../types/commands";

// Mock del logger antes de cualquier import
jest.mock("../../../utils/logger", () => ({
  default: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
    logWarning: jest.fn(),
  },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
  logWarning: jest.fn(),
}));

const {
  CommandRegistry,
} = require("../../../bot/commands/core/CommandRegistry");
const { Command } = require("../../../bot/commands/core/Command");

// Test command implementations
class TestCommand1 extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "test1",
      aliases: ["t1"],
      description: "First test command",
      syntax: "/test1",
      category: "general",
      permissions: ["user"],
      cooldown: 0,
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    return this.createSuccessResult("Test1 executed");
  }
}

class TestCommand2 extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "test2",
      aliases: ["t2"],
      description: "Second test command",
      syntax: "/test2",
      category: "admin",
      permissions: ["admin"],
      cooldown: 5,
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    return this.createSuccessResult("Test2 executed");
  }
}

class TestCommand3 extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "test3",
      aliases: [],
      description: "Third test command",
      syntax: "/test3",
      category: "user",
      permissions: ["user"],
      cooldown: 0,
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    return this.createSuccessResult("Test3 executed");
  }
}

describe("CommandRegistry", () => {
  let registry: InstanceType<typeof CommandRegistry>;
  let command1: TestCommand1;
  let command2: TestCommand2;
  let command3: TestCommand3;

  beforeEach(() => {
    registry = new CommandRegistry({
      autoLoad: false,
      caseSensitive: false,
      enableStats: true,
      defaultCooldown: 0,
    });

    command1 = new TestCommand1();
    command2 = new TestCommand2();
    command3 = new TestCommand3();
  });

  describe("Command Registration", () => {
    test("should register a command successfully", () => {
      const result = registry.register(command1);

      expect(result).toBe(true);
      expect(registry.get("test1")).toBe(command1);
    });

    test("should register command aliases", () => {
      registry.register(command1);

      expect(registry.get("t1")).toBe(command1);
    });

    test("should not register duplicate commands", () => {
      registry.register(command1);
      const result = registry.register(command1);

      expect(result).toBe(false);
    });

    test("should handle case insensitive registration", () => {
      registry.register(command1);

      expect(registry.get("TEST1")).toBe(command1);
      expect(registry.get("T1")).toBe(command1);
    });

    test("should register multiple commands", () => {
      registry.register(command1);
      registry.register(command2);
      registry.register(command3);

      expect(registry.getAll()).toHaveLength(3);
    });
  });

  describe("Command Retrieval", () => {
    beforeEach(() => {
      registry.register(command1);
      registry.register(command2);
      registry.register(command3);
    });

    test("should get command by name", () => {
      expect(registry.get("test1")).toBe(command1);
      expect(registry.get("test2")).toBe(command2);
      expect(registry.get("test3")).toBe(command3);
    });

    test("should get command by alias", () => {
      expect(registry.get("t1")).toBe(command1);
      expect(registry.get("t2")).toBe(command2);
    });

    test("should return null for non-existent command", () => {
      expect(registry.get("nonexistent")).toBeNull();
    });

    test("should get all commands", () => {
      const allCommands = registry.getAll();

      expect(allCommands).toHaveLength(3);
      expect(allCommands).toContain(command1);
      expect(allCommands).toContain(command2);
      expect(allCommands).toContain(command3);
    });

    test("should get commands by category", () => {
      const generalCommands = registry.getByCategory("general");
      const adminCommands = registry.getByCategory("admin");
      const userCommands = registry.getByCategory("user");

      expect(generalCommands).toEqual([command1]);
      expect(adminCommands).toEqual([command2]);
      expect(userCommands).toEqual([command3]);
    });

    test("should get all categories", () => {
      const categories = registry.getCategories();

      expect(categories).toContain("general");
      expect(categories).toContain("admin");
      expect(categories).toContain("user");
      expect(categories).toHaveLength(3);
    });
  });

  describe("Command Enable/Disable", () => {
    beforeEach(() => {
      registry.register(command1);
    });

    test("should enable and disable commands", () => {
      expect(registry.get("test1")).toBe(command1);

      const disableResult = registry.disable("test1");
      expect(disableResult).toBe(true);
      expect(registry.get("test1")).toBeNull();

      const enableResult = registry.enable("test1");
      expect(enableResult).toBe(true);
      expect(registry.get("test1")).toBe(command1);
    });

    test("should return false when enabling/disabling non-existent command", () => {
      expect(registry.enable("nonexistent")).toBe(false);
      expect(registry.disable("nonexistent")).toBe(false);
    });
  });

  describe("Command Search", () => {
    beforeEach(() => {
      registry.register(command1);
      registry.register(command2);
      registry.register(command3);
    });

    test("should search by category", () => {
      const generalCommands = registry.search({ category: "general" });
      const adminCommands = registry.search({ category: "admin" });

      expect(generalCommands).toEqual([command1]);
      expect(adminCommands).toEqual([command2]);
    });

    test("should search by permissions", () => {
      const userCommands = registry.search({ permissions: ["user"] });
      const adminCommands = registry.search({ permissions: ["admin"] });

      expect(userCommands).toHaveLength(2); // command1 and command3
      expect(adminCommands).toEqual([command2]);
    });

    test("should search with multiple filters", () => {
      const result = registry.search({
        category: "general",
        permissions: ["user"],
      });

      expect(result).toEqual([command1]);
    });

    test("should handle empty search results", () => {
      const result = registry.search({ permissions: ["system"] });

      expect(result).toEqual([]);
    });
  });

  describe("Registry Statistics", () => {
    beforeEach(() => {
      registry.register(command1);
      registry.register(command2);
      registry.register(command3);
    });

    test("should provide correct statistics", () => {
      const stats = registry.getStats();

      expect(stats.totalCommands).toBe(3);
      expect(stats.totalExecutions).toBe(0);
      expect(stats.categoryCounts.general).toBe(1);
      expect(stats.categoryCounts.admin).toBe(1);
      expect(stats.categoryCounts.user).toBe(1);
      expect(stats.mostUsedCommands).toEqual([]);
    });

    test("should track most used commands after execution simulation", () => {
      // Simulate command usage by accessing them
      registry.get("test1");
      registry.get("test1");
      registry.get("test2");

      const stats = registry.getStats();
      expect(stats.mostUsedCommands[0]).toBe("test1");
    });
  });

  describe("Registry Options", () => {
    test("should respect case sensitive option", () => {
      const caseSensitiveRegistry = new CommandRegistry({
        caseSensitive: true,
        autoLoad: false,
      });

      caseSensitiveRegistry.register(command1);

      expect(caseSensitiveRegistry.get("test1")).toBe(command1);
      expect(caseSensitiveRegistry.get("TEST1")).toBeNull();
    });

    test("should respect stats disabled option", () => {
      const noStatsRegistry = new CommandRegistry({
        enableStats: false,
        autoLoad: false,
      });

      noStatsRegistry.register(command1);

      // Access command multiple times
      noStatsRegistry.get("test1");
      noStatsRegistry.get("test1");

      const stats = noStatsRegistry.getStats();
      expect(stats.totalExecutions).toBe(0);
    });
  });

  describe("Registry Reload", () => {
    test("should clear and reload commands", () => {
      registry.register(command1);
      registry.register(command2);

      expect(registry.getAll()).toHaveLength(2);

      const reloadCount = registry.reloadCommands();

      // After reload, registry should be empty since we're not loading from files
      expect(reloadCount).toBe(0);
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
