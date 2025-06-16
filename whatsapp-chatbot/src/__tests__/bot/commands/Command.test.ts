describe("Command Base Class", () => {
  test("should load Command class", () => {
    const { Command } = require("../../../bot/commands/core/Command");
    expect(typeof Command).toBe("function");
  });

  test("should be able to create a test command", () => {
    const { Command } = require("../../../bot/commands/core/Command");

    class TestCommand extends Command {
      get metadata() {
        return {
          name: "test",
          aliases: ["t"],
          description: "Test command for unit testing",
          syntax: "/test [message]",
          category: "general",
          permissions: ["user"],
          cooldown: 0,
          examples: ["/test hello"],
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async execute(context: any) {
        const message =
          context.args?.join(" ") || "Test executed successfully!";
        return this.createSuccessResult(
          this.formatResponse(message, "success")
        );
      }
    }

    const command = new TestCommand();
    expect(command.name).toBe("test");
    expect(command.description).toBe("Test command for unit testing");
    expect(command.metadata.name).toBe("test");
  });

  test("should be able to execute a simple command", async () => {
    const { Command } = require("../../../bot/commands/core/Command");

    class SimpleCommand extends Command {
      get metadata() {
        return {
          name: "simple",
          aliases: [],
          description: "Simple test command",
          syntax: "/simple",
          category: "general",
          permissions: ["user"],
          cooldown: 0,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async execute(context: any) {
        return this.createSuccessResult("Simple command works!");
      }
    }

    const command = new SimpleCommand();
    const mockContext = {
      args: [],
      message: { text: "/simple" },
      user: { user_type: "customer" },
    };

    const result = await command.execute(mockContext);
    expect(result.success).toBe(true);
    expect(result.response).toBe("Simple command works!");
  });
});
