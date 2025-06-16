/**
 * Simple test to verify command system imports work correctly
 */

describe("Command System Imports", () => {
  test("should import Command class", async () => {
    const { Command } = await import("../../../bot/commands/core/Command");
    expect(typeof Command).toBe("function");
  });

  test("should import CommandRegistry class", async () => {
    const { CommandRegistry } = await import(
      "../../../bot/commands/core/CommandRegistry"
    );
    expect(typeof CommandRegistry).toBe("function");
  });

  test("should import UnifiedCommandHandler class", async () => {
    const { UnifiedCommandHandler } = await import(
      "../../../bot/commands/core/UnifiedCommandHandler"
    );
    expect(typeof UnifiedCommandHandler).toBe("function");
  });
});
