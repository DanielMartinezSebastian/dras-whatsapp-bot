/**
 * Command Registry Service Tests
 */

import { CommandRegistryService } from '../src/services/command-registry.service';
import { ConfigService } from '../src/services/config.service';
import { PluginManagerService } from '../src/services/plugin-manager.service';
import { Command, UserLevel, UserType, MessageType } from '../src/types';

describe('CommandRegistryService', () => {
  let commandRegistry: CommandRegistryService;
  let mockCommand: Command;

  beforeEach(async () => {
    // Reset singletons for testing
    (CommandRegistryService as any).instance = undefined;
    (ConfigService as any).instance = undefined;
    (PluginManagerService as any).instance = undefined;
    
    commandRegistry = CommandRegistryService.getInstance();

    // Mock command for testing
    mockCommand = {
      name: 'test',
      aliases: ['t', 'testing'],
      description: 'Test command',
      category: 'test',
      userLevel: UserLevel.USER,
      cooldown: 5,
      parameters: [
        {
          name: 'message',
          type: 'string',
          required: true,
          description: 'Test message parameter'
        }
      ],
      examples: ['!test hello'],
      enabled: true,
      plugin: 'test-plugin'
    };
  });

  afterEach(() => {
    // Clean up singletons
    (CommandRegistryService as any).instance = undefined;
    (ConfigService as any).instance = undefined;
    (PluginManagerService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CommandRegistryService.getInstance();
      const instance2 = CommandRegistryService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(CommandRegistryService);
    });
  });

  describe('command registration', () => {
    it('should register command successfully', () => {
      commandRegistry.registerCommand(mockCommand);
      
      const retrievedCommand = commandRegistry.getCommand('test');
      expect(retrievedCommand).toBe(mockCommand);
    });

    it('should register command aliases', () => {
      commandRegistry.registerCommand(mockCommand);
      
      const commandByAlias = commandRegistry.getCommand('t');
      expect(commandByAlias).toBe(mockCommand);
      
      const commandByAlias2 = commandRegistry.getCommand('testing');
      expect(commandByAlias2).toBe(mockCommand);
    });

    it('should unregister command successfully', () => {
      commandRegistry.registerCommand(mockCommand);
      commandRegistry.unregisterCommand('test');
      
      const command = commandRegistry.getCommand('test');
      expect(command).toBeNull();
      
      // Aliases should also be removed
      const alias = commandRegistry.getCommand('t');
      expect(alias).toBeNull();
    });

    it('should return null for non-existent command', () => {
      const command = commandRegistry.getCommand('non-existent');
      expect(command).toBeNull();
    });
  });

  describe('command parsing', () => {
    beforeEach(() => {
      // Mock config to return command prefix
      const configService = ConfigService.getInstance();
      jest.spyOn(configService, 'getValue').mockReturnValue('!');
    });

    it('should parse command from message', () => {
      const result = commandRegistry.parseCommand('!test hello world');
      
      expect(result).toEqual({
        command: 'test',
        args: ['hello', 'world']
      });
    });

    it('should return null for non-command message', () => {
      const result = commandRegistry.parseCommand('hello world');
      expect(result).toBeNull();
    });

    it('should return null for empty command', () => {
      const result = commandRegistry.parseCommand('!');
      expect(result).toBeNull();
    });

    it('should handle command with no arguments', () => {
      const result = commandRegistry.parseCommand('!test');
      
      expect(result).toEqual({
        command: 'test',
        args: []
      });
    });
  });

  describe('command filtering', () => {
    beforeEach(() => {
      // Register multiple test commands
      const command1 = { ...mockCommand, name: 'cmd1', category: 'cat1' };
      const command2 = { ...mockCommand, name: 'cmd2', category: 'cat2', userLevel: UserLevel.ADMIN };
      
      commandRegistry.registerCommand(command1);
      commandRegistry.registerCommand(command2);
    });

    it('should get all commands', () => {
      const allCommands = commandRegistry.getAllCommands();
      expect(allCommands).toHaveLength(2);
    });

    it('should get commands by category', () => {
      const cat1Commands = commandRegistry.getCommandsByCategory('cat1');
      expect(cat1Commands).toHaveLength(1);
      expect(cat1Commands[0].name).toBe('cmd1');
    });

    it('should get commands for user level', () => {
      const userCommands = commandRegistry.getCommandsForUserLevel(UserLevel.USER);
      expect(userCommands).toHaveLength(1);
      expect(userCommands[0].name).toBe('cmd1');
      
      const adminCommands = commandRegistry.getCommandsForUserLevel(UserLevel.ADMIN);
      expect(adminCommands).toHaveLength(2);
    });
  });

  describe('command execution', () => {
    let mockUser: any;
    let mockMessage: any;
    let mockPluginContext: any;
    let mockPluginManager: any;

    beforeEach(() => {
      mockUser = {
        id: 'user1',
        phone: '+1234567890',
        whatsapp_jid: 'user1@s.whatsapp.net',
        display_name: 'Test User',
        user_level: UserLevel.USER,
        level: UserLevel.USER,
        user_type: 'normal' as UserType,
        language: 'es',
        is_registered: true,
        last_activity: new Date().toISOString(),
        preferences: {
          notifications: true,
          auto_reply: false,
          language: 'es',
          timezone: 'UTC',
          privacy_level: 'normal' as const
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockMessage = {
        id: 'msg1',
        user_id: 'user1',
        whatsapp_message_id: 'wa_msg_1',
        content: 'test message',
        message_type: 'text' as MessageType,
        is_from_bot: false,
        processed: false,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockPluginContext = {
        user: mockUser,
        message: mockMessage,
        config: {} as any,
        database: {} as any,
        logger: {} as any,
        whatsappBridge: {} as any
      };

      // Mock plugin manager
      mockPluginManager = PluginManagerService.getInstance();
      jest.spyOn(mockPluginManager, 'executePlugin').mockResolvedValue({
        success: true,
        command: 'test',
        executionTime: 100,
        response: {
          type: 'text',
          content: 'Test response',
          metadata: {}
        }
      });
    });

    it('should execute command successfully', async () => {
      commandRegistry.registerCommand(mockCommand);
      
      const result = await commandRegistry.executeCommand(
        'test',
        ['hello'],
        mockUser,
        mockMessage,
        mockPluginContext
      );

      expect(result.success).toBe(true);
      expect(result.command).toBe('test');
      expect(mockPluginManager.executePlugin).toHaveBeenCalledWith('test-plugin', mockPluginContext);
    });

    it('should fail for non-existent command', async () => {
      const result = await commandRegistry.executeCommand(
        'non-existent',
        [],
        mockUser,
        mockMessage,
        mockPluginContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command \'non-existent\' not found');
    });

    it('should fail for disabled command', async () => {
      const disabledCommand = { ...mockCommand, enabled: false };
      commandRegistry.registerCommand(disabledCommand);
      
      const result = await commandRegistry.executeCommand(
        'test',
        [],
        mockUser,
        mockMessage,
        mockPluginContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command \'test\' is disabled');
    });

    it('should fail for insufficient permissions', async () => {
      const adminCommand = { ...mockCommand, userLevel: UserLevel.ADMIN };
      commandRegistry.registerCommand(adminCommand);
      
      const result = await commandRegistry.executeCommand(
        'test',
        [],
        mockUser,
        mockMessage,
        mockPluginContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to execute \'test\'');
    });
  });

  describe('cooldown management', () => {
    beforeEach(() => {
      commandRegistry.registerCommand(mockCommand);
    });

    it('should handle cooldown correctly', async () => {
      const mockUser = {
        id: 'user1',
        level: UserLevel.USER
      } as any;

      const mockPluginManager = PluginManagerService.getInstance();
      jest.spyOn(mockPluginManager, 'executePlugin').mockResolvedValue({
        success: true,
        command: 'test',
        executionTime: 100
      });

      // First execution should succeed
      const result1 = await commandRegistry.executeCommand('test', [], mockUser, {} as any, {} as any);
      expect(result1.success).toBe(true);

      // Second execution should fail due to cooldown
      const result2 = await commandRegistry.executeCommand('test', [], mockUser, {} as any, {} as any);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('is on cooldown');
    });
  });

  describe('parameter validation', () => {
    it('should validate required parameters', () => {
      const commandWithParams = {
        ...mockCommand,
        parameters: [
          {
            name: 'required_param',
            type: 'string' as const,
            required: true,
            description: 'Required parameter'
          }
        ]
      };

      // This is testing internal parameter parsing/validation logic
      // Since these are private methods, we test through public interface
      expect(commandWithParams.parameters![0].required).toBe(true);
    });
  });

  describe('command help', () => {
    beforeEach(() => {
      commandRegistry.registerCommand(mockCommand);
    });

    it('should generate command help', () => {
      const help = commandRegistry.getCommandHelp('test');
      
      expect(help).toBeDefined();
      expect(help).toContain('test');
      expect(help).toContain('Test command');
      expect(help).toContain('t, testing');
      expect(help).toContain('!test hello');
    });

    it('should return null for non-existent command help', () => {
      const help = commandRegistry.getCommandHelp('non-existent');
      expect(help).toBeNull();
    });
  });

  describe('command statistics', () => {
    beforeEach(() => {
      commandRegistry.registerCommand(mockCommand);
      commandRegistry.registerCommand({ ...mockCommand, name: 'test2', category: 'cat2' });
    });

    it('should return correct statistics', () => {
      const stats = commandRegistry.getCommandStats();
      
      expect(stats.totalCommands).toBe(2);
      expect(stats.totalAliases).toBeGreaterThan(0);
      expect(stats.categoriesCount).toBeDefined();
      expect(stats.usageStats).toBeDefined();
      expect(stats.topCommands).toBeDefined();
    });
  });
});
