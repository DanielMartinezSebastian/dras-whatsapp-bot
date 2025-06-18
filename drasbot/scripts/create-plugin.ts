#!/usr/bin/env tsx

/**
 * Plugin Generator Script
 * Creates new plugin templates for DrasBot v2.0
 */

import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface PluginOptions {
  name: string;
  type: 'command' | 'context' | 'middleware' | 'service';
  description?: string;
  author?: string;
  version?: string;
}

async function main() {
  const argv = (await yargs(hideBin(process.argv))
    .command('create <name>', 'Create a new plugin', yargs => {
      return yargs
        .positional('name', {
          describe: 'Plugin name (kebab-case)',
          type: 'string',
          demandOption: true,
        })
        .option('type', {
          alias: 't',
          type: 'string',
          choices: ['command', 'context', 'middleware', 'service'],
          default: 'command',
          description: 'Type of plugin to create',
        })
        .option('description', {
          alias: 'd',
          type: 'string',
          description: 'Plugin description',
        })
        .option('author', {
          alias: 'a',
          type: 'string',
          description: 'Plugin author',
          default: 'DrasBot Developer',
        })
        .option('version', {
          alias: 'v',
          type: 'string',
          description: 'Plugin version',
          default: '1.0.0',
        });
    })
    .demandCommand(1, 'You need to specify a command')
    .help().argv) as any;

  const options: PluginOptions = {
    name: argv.name,
    type: argv.type,
    description: argv.description || `A ${argv.type} plugin for DrasBot`,
    author: argv.author,
    version: argv.version,
  };

  console.log('\n🔌 DrasBot Plugin Generator\n');
  console.log(`Creating ${options.type} plugin: ${options.name}\n`);

  try {
    await createPlugin(options);
    console.log('\n✅ Plugin created successfully!\n');
    printUsageInstructions(options);
  } catch (error) {
    console.error(
      '\n❌ Plugin creation failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

async function createPlugin(options: PluginOptions): Promise<void> {
  const pluginDir = path.join(process.cwd(), 'src', 'plugins', options.name);

  // Create plugin directory
  if (fs.existsSync(pluginDir)) {
    throw new Error(`Plugin directory already exists: ${pluginDir}`);
  }

  fs.mkdirSync(pluginDir, { recursive: true });
  console.log(`📁 Created directory: src/plugins/${options.name}/`);

  // Generate files based on plugin type
  switch (options.type) {
    case 'command':
      await createCommandPlugin(pluginDir, options);
      break;
    case 'context':
      await createContextPlugin(pluginDir, options);
      break;
    case 'middleware':
      await createMiddlewarePlugin(pluginDir, options);
      break;
    case 'service':
      await createServicePlugin(pluginDir, options);
      break;
  }

  // Create common files
  await createPackageJson(pluginDir, options);
  await createReadme(pluginDir, options);
  await createTests(pluginDir, options);
}

async function createCommandPlugin(
  pluginDir: string,
  options: PluginOptions
): Promise<void> {
  const className = toPascalCase(options.name);
  const commandName = options.name.replace(/-/g, '');

  const indexContent = `/**
 * ${className} Command Plugin
 * ${options.description}
 */

import { CommandHandler, CommandContext, CommandResult } from '../../interfaces';
import { UserLevel } from '../../types';
import { Logger } from '../../utils/logger';

export class ${className}Command implements CommandHandler {
  public readonly name = '${commandName}';
  public readonly description = '${options.description}';
  public readonly usage = '!${commandName} [options]';
  public readonly userLevel = UserLevel.USER;
  public readonly category = 'general';
  
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      this.logger.info('${className}Command', 'Executing command', {
        user: context.user.id,
        message: context.message.content
      });

      // TODO: Implement your command logic here
      const response = this.generateResponse(context);

      return {
        success: true,
        response,
        metadata: {
          command: this.name,
          executedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('${className}Command', 'Command execution failed', {
        error: error instanceof Error ? error.message : error
      });

      return {
        success: false,
        error: 'Command execution failed',
        response: 'Lo siento, ocurrió un error al procesar tu comando.'
      };
    }
  }

  private generateResponse(context: CommandContext): string {
    // TODO: Implement your response logic
    return \`Hola \${context.user.name}! Este es el comando \${this.name}.\`;
  }

  async validate(context: CommandContext): Promise<boolean> {
    // TODO: Implement validation logic if needed
    return true;
  }

  getHelp(): string {
    return \`\${this.usage}

\${this.description}

Ejemplos:
  !\${this.name}           - Uso básico
  !\${this.name} --help   - Mostrar ayuda
\`;
  }
}

export default ${className}Command;`;

  fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexContent);
  console.log(`📄 Created index.ts (command handler)`);
}

async function createContextPlugin(
  pluginDir: string,
  options: PluginOptions
): Promise<void> {
  const className = toPascalCase(options.name);

  const indexContent = `/**
 * ${className} Context Plugin
 * ${options.description}
 */

import { ContextHandler, ContextDetectionContext, ContextExecutionContext, ContextResult } from '../../interfaces';
import { ContextType, UserLevel } from '../../types';
import { Logger } from '../../utils/logger';

export class ${className}Context implements ContextHandler {
  public readonly name = '${options.name}';
  public readonly description = '${options.description}';
  public readonly metadata = {
    keywords: ['${options.name}', 'keyword2'], // TODO: Add relevant keywords
    userLevel: UserLevel.USER,
    priority: 1
  };
  
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async detect(context: ContextDetectionContext): Promise<boolean> {
    try {
      // TODO: Implement detection logic
      const message = context.message.content.toLowerCase();
      
      return this.metadata.keywords.some(keyword => 
        message.includes(keyword.toLowerCase())
      );
    } catch (error) {
      this.logger.error('${className}Context', 'Detection failed', {
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  async execute(context: ContextExecutionContext): Promise<ContextResult> {
    try {
      this.logger.info('${className}Context', 'Executing context', {
        user: context.user.id,
        contextType: context.contextType
      });

      // TODO: Implement context execution logic
      const response = await this.processContext(context);

      return {
        success: true,
        response,
        nextContext: null, // or specify next context if needed
        metadata: {
          context: this.name,
          executedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('${className}Context', 'Context execution failed', {
        error: error instanceof Error ? error.message : error
      });

      return {
        success: false,
        error: 'Context execution failed',
        response: 'Lo siento, ocurrió un error al procesar tu solicitud.'
      };
    }
  }

  private async processContext(context: ContextExecutionContext): Promise<string> {
    // TODO: Implement your context processing logic
    return \`Procesando contexto \${this.name} para \${context.user.name}\`;
  }

  async cleanup(userId: string): Promise<void> {
    // TODO: Implement cleanup logic if needed
    this.logger.info('${className}Context', 'Context cleanup', { userId });
  }

  getContextType(): ContextType {
    return ContextType.CUSTOM; // TODO: Choose appropriate context type
  }
}

export default ${className}Context;`;

  fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexContent);
  console.log(`📄 Created index.ts (context handler)`);
}

async function createMiddlewarePlugin(
  pluginDir: string,
  options: PluginOptions
): Promise<void> {
  const className = toPascalCase(options.name);

  const indexContent = `/**
 * ${className} Middleware Plugin
 * ${options.description}
 */

import { MiddlewareHandler, MiddlewareContext, MiddlewareResult } from '../../interfaces';
import { Logger } from '../../utils/logger';

export class ${className}Middleware implements MiddlewareHandler {
  public readonly name = '${options.name}';
  public readonly description = '${options.description}';
  public readonly priority = 50; // Lower number = higher priority
  
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async execute(context: MiddlewareContext, next: () => Promise<MiddlewareResult>): Promise<MiddlewareResult> {
    try {
      this.logger.debug('${className}Middleware', 'Processing middleware', {
        user: context.user.id,
        message: context.message.id
      });

      // TODO: Implement pre-processing logic here
      const preProcessResult = await this.preProcess(context);
      
      if (!preProcessResult.continue) {
        return preProcessResult;
      }

      // Call next middleware/handler
      const result = await next();

      // TODO: Implement post-processing logic here
      return await this.postProcess(context, result);
      
    } catch (error) {
      this.logger.error('${className}Middleware', 'Middleware execution failed', {
        error: error instanceof Error ? error.message : error
      });

      return {
        success: false,
        error: 'Middleware execution failed',
        continue: false
      };
    }
  }

  private async preProcess(context: MiddlewareContext): Promise<MiddlewareResult> {
    // TODO: Implement pre-processing logic
    // Examples: rate limiting, user validation, content filtering
    
    return {
      success: true,
      continue: true
    };
  }

  private async postProcess(context: MiddlewareContext, result: MiddlewareResult): Promise<MiddlewareResult> {
    // TODO: Implement post-processing logic
    // Examples: logging, analytics, response modification
    
    return result;
  }
}

export default ${className}Middleware;`;

  fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexContent);
  console.log(`📄 Created index.ts (middleware handler)`);
}

async function createServicePlugin(
  pluginDir: string,
  options: PluginOptions
): Promise<void> {
  const className = toPascalCase(options.name);

  const indexContent = `/**
 * ${className} Service Plugin
 * ${options.description}
 */

import { ServicePlugin } from '../../interfaces';
import { Logger } from '../../utils/logger';
import { ConfigService } from '../../services/config.service';

export class ${className}Service implements ServicePlugin {
  private static instance: ${className}Service;
  
  public readonly name = '${options.name}';
  public readonly description = '${options.description}';
  public readonly version = '${options.version}';
  
  private logger: Logger;
  private config: ConfigService;
  private isInitialized = false;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigService.getInstance();
  }

  public static getInstance(): ${className}Service {
    if (!${className}Service.instance) {
      ${className}Service.instance = new ${className}Service();
    }
    return ${className}Service.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('${className}Service', 'Initializing service');

      // TODO: Implement initialization logic
      await this.loadConfiguration();
      await this.setupService();

      this.isInitialized = true;
      this.logger.info('${className}Service', 'Service initialized successfully');
    } catch (error) {
      this.logger.error('${className}Service', 'Service initialization failed', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('${className}Service', 'Shutting down service');

      // TODO: Implement cleanup logic
      await this.cleanup();

      this.isInitialized = false;
      this.logger.info('${className}Service', 'Service shutdown completed');
    } catch (error) {
      this.logger.error('${className}Service', 'Service shutdown failed', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async loadConfiguration(): Promise<void> {
    // TODO: Load service-specific configuration
    const serviceConfig = this.config.getValue(\`plugins.\${this.name}\`, {});
    this.logger.debug('${className}Service', 'Configuration loaded', { config: serviceConfig });
  }

  private async setupService(): Promise<void> {
    // TODO: Implement service setup logic
  }

  private async cleanup(): Promise<void> {
    // TODO: Implement cleanup logic
  }

  // TODO: Add your service methods here
  async performAction(data: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      this.logger.debug('${className}Service', 'Performing action', { data });
      
      // TODO: Implement your service logic
      const result = await this.processData(data);
      
      return result;
    } catch (error) {
      this.logger.error('${className}Service', 'Action failed', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async processData(data: any): Promise<any> {
    // TODO: Implement data processing logic
    return { processed: true, data };
  }

  getStatus(): { initialized: boolean; health: 'healthy' | 'degraded' | 'unhealthy' } {
    return {
      initialized: this.isInitialized,
      health: this.isInitialized ? 'healthy' : 'unhealthy'
    };
  }
}

export default ${className}Service;`;

  fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexContent);
  console.log(`📄 Created index.ts (service)`);
}

async function createPackageJson(
  pluginDir: string,
  options: PluginOptions
): Promise<void> {
  const packageJson = {
    name: `@drasbot/plugin-${options.name}`,
    version: options.version,
    description: options.description,
    main: 'index.ts',
    author: options.author,
    license: 'MIT',
    keywords: ['drasbot', 'plugin', options.type],
    peerDependencies: {
      drasbot: '^2.0.0',
    },
    drasbot: {
      plugin: {
        name: options.name,
        type: options.type,
        version: options.version,
        entryPoint: 'index.ts',
      },
    },
  };

  fs.writeFileSync(
    path.join(pluginDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log(`📄 Created package.json`);
}

async function createReadme(
  pluginDir: string,
  options: PluginOptions
): Promise<void> {
  const className = toPascalCase(options.name);

  const readmeContent = `# ${className} Plugin

${options.description}

## Type
${options.type}

## Installation

This plugin is part of the DrasBot v2.0 plugin system.

## Usage

\`\`\`typescript
import { ${className}${toPascalCase(options.type)} } from './plugins/${options.name}';

// TODO: Add usage examples
\`\`\`

## Configuration

Add configuration to your main config file:

\`\`\`json
{
  "plugins": {
    "${options.name}": {
      // TODO: Add configuration options
    }
  }
}
\`\`\`

## Development

### Testing

\`\`\`bash
npm test
\`\`\`

### Building

\`\`\`bash
npm run build
\`\`\`

## License

MIT

## Author

${options.author}
`;

  fs.writeFileSync(path.join(pluginDir, 'README.md'), readmeContent);
  console.log(`📄 Created README.md`);
}

async function createTests(
  pluginDir: string,
  options: PluginOptions
): Promise<void> {
  const className = toPascalCase(options.name);

  const testContent = `/**
 * Tests for ${className} Plugin
 */

import { ${className}${toPascalCase(options.type)} } from './index';

describe('${className}${toPascalCase(options.type)}', () => {
  let plugin: ${className}${toPascalCase(options.type)};

  beforeEach(() => {
    plugin = new ${className}${toPascalCase(options.type)}();
  });

  describe('initialization', () => {
    it('should create plugin instance', () => {
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('${options.name}');
      expect(plugin.description).toBe('${options.description}');
    });
  });

  // TODO: Add more tests specific to your plugin type
  ${getTypeSpecificTests(options.type)}
});`;

  fs.writeFileSync(path.join(pluginDir, 'index.test.ts'), testContent);
  console.log(`📄 Created index.test.ts`);
}

function getTypeSpecificTests(type: string): string {
  switch (type) {
    case 'command':
      return `
  describe('command execution', () => {
    it('should execute command successfully', async () => {
      // TODO: Implement command execution test
    });

    it('should validate command input', async () => {
      // TODO: Implement validation test
    });
  });`;

    case 'context':
      return `
  describe('context detection', () => {
    it('should detect context correctly', async () => {
      // TODO: Implement context detection test
    });

    it('should execute context successfully', async () => {
      // TODO: Implement context execution test
    });
  });`;

    case 'middleware':
      return `
  describe('middleware processing', () => {
    it('should process middleware correctly', async () => {
      // TODO: Implement middleware processing test
    });

    it('should handle pre and post processing', async () => {
      // TODO: Implement pre/post processing test
    });
  });`;

    case 'service':
      return `
  describe('service functionality', () => {
    it('should initialize service correctly', async () => {
      // TODO: Implement service initialization test
    });

    it('should perform actions successfully', async () => {
      // TODO: Implement service action test
    });
  });`;

    default:
      return '';
  }
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function printUsageInstructions(options: PluginOptions): void {
  console.log('📋 Plugin created successfully!\n');
  console.log('Next steps:\n');
  console.log(
    `1. Edit src/plugins/${options.name}/index.ts to implement your plugin logic`
  );
  console.log(`2. Add tests in src/plugins/${options.name}/index.test.ts`);
  console.log(`3. Update the README.md with usage examples`);
  console.log(`4. Register your plugin in the main plugin registry\n`);

  console.log('File structure:');
  console.log(`src/plugins/${options.name}/`);
  console.log('├── index.ts       # Main plugin implementation');
  console.log('├── index.test.ts  # Unit tests');
  console.log('├── package.json   # Plugin metadata');
  console.log('└── README.md      # Documentation\n');
}

// Run the generator
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
