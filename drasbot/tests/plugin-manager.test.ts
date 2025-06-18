/**
 * Plugin Manager Service Tests
 */

import { PluginManagerService } from '../src/services/plugin-manager.service';
import { ConfigService } from '../src/services/config.service';
import { Plugin, UserLevel, UserType, MessageType } from '../src/types';

describe('PluginManagerService', () => {
  let pluginManager: PluginManagerService;
  let mockPlugin: Plugin;

  beforeEach(async () => {
    // Reset singleton for testing
    (PluginManagerService as any).instance = undefined;

    pluginManager = PluginManagerService.getInstance();

    // Mock plugin for testing
    mockPlugin = {
      info: {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        category: 'command',
        priority: 1,
        dependencies: [],
      },
      initialize: jest.fn(),
      shutdown: jest.fn(),
      execute: jest.fn().mockResolvedValue({
        success: true,
        command: 'test',
        executionTime: 100,
        response: {
          type: 'text',
          content: 'Test response',
          metadata: {},
        },
      }),
    };
  });

  afterEach(() => {
    // Clean up singletons
    (PluginManagerService as any).instance = undefined;
    (ConfigService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PluginManagerService.getInstance();
      const instance2 = PluginManagerService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(PluginManagerService);
    });
  });

  describe('plugin management', () => {
    it('should register plugin manually', () => {
      // Add plugin directly to the plugins map for testing
      (pluginManager as any).plugins.set(mockPlugin.info.name, mockPlugin);
      (pluginManager as any).enabledPlugins.add(mockPlugin.info.name);

      const retrievedPlugin = pluginManager.getPlugin('test-plugin');
      expect(retrievedPlugin).toBe(mockPlugin);
    });

    it('should return null for non-existent plugin', () => {
      const plugin = pluginManager.getPlugin('non-existent');
      expect(plugin).toBeNull();
    });

    it('should return all plugins', () => {
      // Create test plugins with proper names
      const plugin1 = {
        ...mockPlugin,
        info: { ...mockPlugin.info, name: 'plugin1' },
      };
      const plugin2 = {
        ...mockPlugin,
        info: { ...mockPlugin.info, name: 'plugin2' },
      };

      // Add test plugins
      (pluginManager as any).plugins.set('plugin1', plugin1);
      (pluginManager as any).plugins.set('plugin2', plugin2);

      const allPlugins = pluginManager.getAllPlugins();
      expect(allPlugins).toHaveLength(2);
    });

    it('should return only enabled plugins', () => {
      // Create test plugins with proper names
      const plugin1 = {
        ...mockPlugin,
        info: { ...mockPlugin.info, name: 'plugin1' },
      };
      const plugin2 = {
        ...mockPlugin,
        info: { ...mockPlugin.info, name: 'plugin2' },
      };

      // Add test plugins
      (pluginManager as any).plugins.set('plugin1', plugin1);
      (pluginManager as any).plugins.set('plugin2', plugin2);

      // Enable only one plugin
      (pluginManager as any).enabledPlugins.add('plugin1');

      const enabledPlugins = pluginManager.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0].info.name).toBe('plugin1');
    });
  });

  describe('plugin validation', () => {
    it('should validate plugin dependencies when no dependencies', () => {
      const isValid = pluginManager.validateDependencies(mockPlugin);
      expect(isValid).toBe(true);
    });

    it('should validate plugin dependencies when dependencies are met', () => {
      // Create dependency plugin
      const dependencyPlugin = {
        ...mockPlugin,
        info: { ...mockPlugin.info, name: 'dependency' },
      };

      // Add dependency plugin and enable it
      (pluginManager as any).plugins.set('dependency', dependencyPlugin);
      (pluginManager as any).enabledPlugins.add('dependency');

      // Create plugin with dependency
      const pluginWithDep = {
        ...mockPlugin,
        info: {
          ...mockPlugin.info,
          name: 'dependent',
          dependencies: ['dependency'],
        },
      };

      const isValid = pluginManager.validateDependencies(pluginWithDep);
      expect(isValid).toBe(true);
    });

    it('should fail validation when dependencies are not met', () => {
      const pluginWithDep = {
        ...mockPlugin,
        info: { ...mockPlugin.info, dependencies: ['missing-dependency'] },
      };

      const isValid = pluginManager.validateDependencies(pluginWithDep);
      expect(isValid).toBe(false);
    });
  });

  describe('plugin context', () => {
    it('should create plugin context correctly', () => {
      const mockUser = {
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
          privacy_level: 'normal' as const,
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockMessage = {
        id: 'msg1',
        user_id: 'user1',
        whatsapp_message_id: 'wa_msg_1',
        content: 'test message',
        message_type: 'text' as MessageType,
        is_from_bot: false,
        processed: false,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const context = pluginManager.createPluginContext(mockUser, mockMessage);

      expect(context.user).toBe(mockUser);
      expect(context.message).toBe(mockMessage);
      expect(context.config).toBeDefined();
      expect(context.database).toBeDefined();
      expect(context.logger).toBeDefined();
      expect(context.whatsappBridge).toBeDefined();
    });
  });

  describe('plugin execution', () => {
    it('should execute plugin successfully', async () => {
      // Add and enable plugin
      (pluginManager as any).plugins.set('test-plugin', mockPlugin);
      (pluginManager as any).enabledPlugins.add('test-plugin');

      const mockContext = {
        user: {} as any,
        message: {} as any,
        config: {} as any,
        database: {} as any,
        logger: {} as any,
        whatsappBridge: {} as any,
      };

      const result = await pluginManager.executePlugin(
        'test-plugin',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.command).toBe('test');
      expect(mockPlugin.execute).toHaveBeenCalledWith(mockContext);
    });

    it('should throw error for non-existent plugin', async () => {
      const mockContext = {} as any;

      await expect(
        pluginManager.executePlugin('non-existent', mockContext)
      ).rejects.toThrow("Plugin 'non-existent' is not loaded");
    });

    it('should throw error for disabled plugin', async () => {
      // Add plugin but don't enable it
      (pluginManager as any).plugins.set('test-plugin', mockPlugin);

      const mockContext = {} as any;

      await expect(
        pluginManager.executePlugin('test-plugin', mockContext)
      ).rejects.toThrow("Plugin 'test-plugin' is not enabled");
    });
  });

  describe('plugin statistics', () => {
    it('should return correct plugin statistics', () => {
      // Add test plugins of different categories
      const commandPlugin = {
        ...mockPlugin,
        info: {
          ...mockPlugin.info,
          name: 'cmd1',
          category: 'command' as const,
        },
      };
      const contextPlugin = {
        ...mockPlugin,
        info: {
          ...mockPlugin.info,
          name: 'ctx1',
          category: 'context' as const,
        },
      };

      (pluginManager as any).plugins.set('cmd1', commandPlugin);
      (pluginManager as any).plugins.set('ctx1', contextPlugin);
      (pluginManager as any).enabledPlugins.add('cmd1');

      const stats = pluginManager.getPluginStats();

      expect(stats.totalPlugins).toBe(2);
      expect(stats.enabledPlugins).toBe(1);
      expect(stats.disabledPlugins).toBe(1);
      expect(stats.categories.command).toBe(1);
      expect(stats.categories.context).toBe(1);
    });
  });

  describe('enable/disable plugins', () => {
    beforeEach(() => {
      (pluginManager as any).plugins.set('test-plugin', mockPlugin);
    });

    it('should enable plugin successfully', async () => {
      await pluginManager.enablePlugin('test-plugin');

      const enabledPlugins = pluginManager.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0].info.name).toBe('test-plugin');
    });

    it('should disable plugin successfully', async () => {
      // First enable the plugin
      (pluginManager as any).enabledPlugins.add('test-plugin');

      await pluginManager.disablePlugin('test-plugin');

      const enabledPlugins = pluginManager.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(0);
    });

    it('should throw error when enabling non-existent plugin', async () => {
      await expect(pluginManager.enablePlugin('non-existent')).rejects.toThrow(
        "Plugin 'non-existent' is not loaded"
      );
    });
  });
});
