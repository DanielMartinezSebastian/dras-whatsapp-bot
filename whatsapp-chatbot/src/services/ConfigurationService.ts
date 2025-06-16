import { EventEmitter } from "events";
import * as fs from "fs/promises";
import * as path from "path";
import { logInfo, logError, logWarning } from "../utils/logger";
import {
  BotConfiguration,
  ConfigurationManagerConfig,
  ValidationResult,
  ConfigurationChangeEvent,
  ExportOptions,
  ImportOptions,
  ConfigurationSection,
} from "../types/configuration";

/**
 * Servicio central de gestión de configuración
 * Maneja carga, guardado, validación y eventos de cambio de configuración
 */
export class ConfigurationService extends EventEmitter {
  private config: BotConfiguration | null = null;
  private managerConfig: ConfigurationManagerConfig;
  private configPath: string;
  private defaultConfigPath: string;
  private isLoaded: boolean = false;
  private isWatching: boolean = false;
  private watcher: any = null;

  constructor(managerConfig?: Partial<ConfigurationManagerConfig>) {
    super();

    this.managerConfig = {
      configPath: "./src/config/custom",
      backupPath: "./src/config/backups",
      watchForChanges: true,
      autoSave: true,
      validationEnabled: true,
      maxBackups: 10,
      ...managerConfig,
    };

    this.configPath = path.resolve(this.managerConfig.configPath);
    this.defaultConfigPath = path.resolve("./src/config/default");
  }

  /**
   * Inicializa el servicio de configuración
   */
  public async initialize(): Promise<void> {
    try {
      logInfo("🔧 Inicializando ConfigurationService...");

      // Crear directorios si no existen
      await this.ensureDirectories();

      // Cargar configuración
      await this.loadConfiguration();

      // Configurar watcher si está habilitado
      if (this.managerConfig.watchForChanges) {
        await this.setupFileWatcher();
      }

      this.isLoaded = true;
      logInfo("✅ ConfigurationService inicializado correctamente");

      this.emit("initialized", this.config);
    } catch (error) {
      logError(`❌ Error inicializando ConfigurationService: ${error}`);
      throw error;
    }
  }

  /**
   * Carga la configuración desde archivos
   */
  public async loadConfiguration(): Promise<BotConfiguration> {
    try {
      logInfo("📂 Cargando configuración...");

      const defaultConfig = await this.loadDefaultConfiguration();
      const customConfig = await this.loadCustomConfiguration();

      // Combinar configuración por defecto con personalizada
      this.config = this.mergeConfigurations(defaultConfig, customConfig);

      // Validar configuración si está habilitado
      if (this.managerConfig.validationEnabled) {
        const validation = await this.validateConfiguration(this.config);
        if (!validation.isValid) {
          logWarning("⚠️ Configuración contiene errores de validación");
          validation.errors.forEach((error) => {
            logError(`  - ${error.path}: ${error.message}`);
          });
        }
      }

      logInfo("✅ Configuración cargada exitosamente");
      this.emit("configurationLoaded", this.config);

      return this.config;
    } catch (error) {
      logError(`❌ Error cargando configuración: ${error}`);
      throw error;
    }
  }

  /**
   * Guarda la configuración actual
   */
  public async saveConfiguration(config?: BotConfiguration): Promise<void> {
    try {
      const configToSave = config || this.config;
      if (!configToSave) {
        throw new Error("No hay configuración para guardar");
      }

      logInfo("💾 Guardando configuración...");

      // Crear respaldo si está habilitado
      if (this.managerConfig.maxBackups > 0) {
        await this.createBackup();
      }

      // Guardar cada sección por separado
      await this.saveConfigurationSection("bot-config.json", {
        bot: configToSave.bot,
        behavior: configToSave.behavior,
        system: configToSave.system,
      });

      await this.saveConfigurationSection("messages.json", {
        greetings: configToSave.messages.greetings,
        farewells: configToSave.messages.farewells,
        questions: configToSave.messages.questions,
        help: configToSave.messages.help,
        responses: configToSave.messages.responses,
      });

      await this.saveConfigurationSection(
        "commands.json",
        configToSave.messages.commands
      );
      await this.saveConfigurationSection(
        "errors.json",
        configToSave.messages.errors
      );
      await this.saveConfigurationSection(
        "system.json",
        configToSave.messages.system
      );

      this.config = configToSave;
      logInfo("✅ Configuración guardada exitosamente");

      this.emit("configurationSaved", this.config);
    } catch (error) {
      logError(`❌ Error guardando configuración: ${error}`);
      throw error;
    }
  }

  /**
   * Obtiene la configuración actual
   */
  public getConfiguration(): BotConfiguration | null {
    return this.config;
  }

  /**
   * Obtiene una sección específica de la configuración
   */
  public getConfigurationSection<T>(section: ConfigurationSection): T | null {
    if (!this.config) return null;
    return this.config[section] as T;
  }

  /**
   * Actualiza una sección de la configuración
   */
  public async updateConfigurationSection(
    section: ConfigurationSection,
    data: any,
    source: string = "system",
    user?: string
  ): Promise<void> {
    try {
      if (!this.config) {
        throw new Error("Configuración no cargada");
      }

      const oldValue = this.config[section];
      this.config[section] = { ...this.config[section], ...data };

      // Crear evento de cambio
      const changeEvent: ConfigurationChangeEvent = {
        timestamp: new Date(),
        section,
        path: section,
        oldValue,
        newValue: this.config[section],
        source: source as any,
        user,
      };

      // Guardar si auto-save está habilitado
      if (this.managerConfig.autoSave) {
        await this.saveConfiguration();
      }

      logInfo(`🔄 Sección '${section}' actualizada`);
      this.emit("configurationChanged", changeEvent);
    } catch (error) {
      logError(`❌ Error actualizando sección ${section}: ${error}`);
      throw error;
    }
  }

  /**
   * Actualiza un valor específico en la configuración
   */
  public async updateConfigurationValue(
    path: string,
    value: any,
    source: string = "system",
    user?: string
  ): Promise<void> {
    try {
      if (!this.config) {
        throw new Error("Configuración no cargada");
      }

      const oldValue = this.getValueByPath(this.config, path);
      this.setValueByPath(this.config, path, value);

      // Crear evento de cambio
      const changeEvent: ConfigurationChangeEvent = {
        timestamp: new Date(),
        section: path.split(".")[0] as ConfigurationSection,
        path,
        oldValue,
        newValue: value,
        source: source as any,
        user,
      };

      // Guardar si auto-save está habilitado
      if (this.managerConfig.autoSave) {
        await this.saveConfiguration();
      }

      logInfo(`🔄 Valor '${path}' actualizado`);
      this.emit("configurationChanged", changeEvent);
    } catch (error) {
      logError(`❌ Error actualizando valor ${path}: ${error}`);
      throw error;
    }
  }

  /**
   * Recarga la configuración desde archivos
   */
  public async reloadConfiguration(): Promise<void> {
    try {
      logInfo("🔄 Recargando configuración...");
      await this.loadConfiguration();
      this.emit("configurationReloaded", this.config);
    } catch (error) {
      logError(`❌ Error recargando configuración: ${error}`);
      throw error;
    }
  }

  /**
   * Valida la configuración actual
   */
  public async validateConfiguration(
    config: BotConfiguration
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // Validaciones básicas
      if (!config.bot?.name || config.bot.name.length < 1) {
        errors.push({
          path: "bot.name",
          message: "El nombre del bot es requerido",
          value: config.bot?.name,
        });
      }

      if (!config.bot?.commandPrefix || config.bot.commandPrefix.length < 1) {
        errors.push({
          path: "bot.commandPrefix",
          message: "El prefijo de comandos es requerido",
          value: config.bot?.commandPrefix,
        });
      }

      // Validar límites numéricos
      if (config.bot?.maxDailyResponses && config.bot.maxDailyResponses < 1) {
        errors.push({
          path: "bot.maxDailyResponses",
          message: "El máximo de respuestas diarias debe ser mayor a 0",
          value: config.bot.maxDailyResponses,
        });
      }

      // Validar existencia de mensajes esenciales
      const requiredMessages = [
        "greetings.new",
        "help.general",
        "responses.default",
      ];
      for (const messagePath of requiredMessages) {
        const messages = this.getValueByPath(config.messages, messagePath);
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          errors.push({
            path: `messages.${messagePath}`,
            message: "Se requiere al menos un mensaje en esta categoría",
            value: messages,
          });
        }
      }

      logInfo(
        `🔍 Validación completada: ${errors.length} errores, ${warnings.length} advertencias`
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logError(`❌ Error durante validación: ${error}`);
      return {
        isValid: false,
        errors: [
          {
            path: "validation",
            message: `Error de validación: ${error}`,
            value: null,
          },
        ],
        warnings,
      };
    }
  }

  /**
   * Exporta la configuración
   */
  public async exportConfiguration(options: ExportOptions): Promise<string> {
    try {
      if (!this.config) {
        throw new Error("No hay configuración para exportar");
      }

      const configToExport: any = {};
      const sections =
        options.sections ||
        (Object.keys(this.config) as ConfigurationSection[]);

      for (const section of sections) {
        configToExport[section] = this.config[section];
      }

      let exported: string;
      switch (options.format) {
        case "json":
          exported = options.prettify
            ? JSON.stringify(configToExport, null, 2)
            : JSON.stringify(configToExport);
          break;
        default:
          exported = JSON.stringify(configToExport, null, 2);
      }

      logInfo("📤 Configuración exportada exitosamente");
      return exported;
    } catch (error) {
      logError(`❌ Error exportando configuración: ${error}`);
      throw error;
    }
  }

  /**
   * Importa configuración
   */
  public async importConfiguration(
    data: string,
    options: ImportOptions
  ): Promise<void> {
    try {
      const importedConfig = JSON.parse(data);

      if (options.validate) {
        const validation = await this.validateConfiguration(importedConfig);
        if (!validation.isValid) {
          throw new Error(
            `Configuración inválida: ${validation.errors
              .map((e) => e.message)
              .join(", ")}`
          );
        }
      }

      if (options.backup && this.config) {
        await this.createBackup();
      }

      if (options.dryRun) {
        logInfo("🧪 Modo dry-run: configuración validada pero no aplicada");
        return;
      }

      if (options.merge && this.config) {
        this.config = this.mergeConfigurations(this.config, importedConfig);
      } else {
        this.config = importedConfig;
      }

      await this.saveConfiguration();
      logInfo("📥 Configuración importada exitosamente");

      this.emit("configurationImported", this.config);
    } catch (error) {
      logError(`❌ Error importando configuración: ${error}`);
      throw error;
    }
  }

  /**
   * Limpia recursos y detiene el servicio
   */
  public async cleanup(): Promise<void> {
    try {
      logInfo("🧹 Limpiando ConfigurationService...");

      if (this.watcher) {
        this.watcher.close();
        this.isWatching = false;
      }

      this.removeAllListeners();
      this.isLoaded = false;

      logInfo("✅ ConfigurationService limpiado");
    } catch (error) {
      logError(`❌ Error durante limpieza: ${error}`);
    }
  }

  // Métodos privados

  private async ensureDirectories(): Promise<void> {
    const dirs = [this.configPath, this.managerConfig.backupPath];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        logInfo(`📁 Directorio creado: ${dir}`);
      }
    }
  }

  private async loadDefaultConfiguration(): Promise<BotConfiguration> {
    const configFiles = [
      "bot-config.json",
      "messages.json",
      "commands.json",
      "errors.json",
      "system.json",
      "responses.json",
    ];

    const config: any = { messages: {} };

    for (const fileName of configFiles) {
      const filePath = path.join(this.defaultConfigPath, fileName);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        if (fileName === "bot-config.json") {
          Object.assign(config, data);
        } else if (fileName === "responses.json") {
          // Caso especial para responses.json: copiar a ambas ubicaciones
          config.messages.responses = data.responses || {};
          config.messages.contextual = data.contextual || {};
          // Mantener también una copia a nivel raíz para compatibilidad
          Object.assign(config, data);
        } else {
          const key = fileName.replace(".json", "");
          if (key === "messages") {
            Object.assign(config.messages, data);
          } else {
            config.messages[key] = data;
          }
        }
      } catch (error) {
        logWarning(`⚠️ No se pudo cargar archivo por defecto: ${fileName}`);
      }
    }

    return config as BotConfiguration;
  }

  private async loadCustomConfiguration(): Promise<Partial<BotConfiguration>> {
    const config: any = { messages: {} };

    try {
      const files = await fs.readdir(this.configPath);

      for (const fileName of files) {
        if (!fileName.endsWith(".json")) continue;

        const filePath = path.join(this.configPath, fileName);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const data = JSON.parse(content);

          if (fileName === "bot-config.json") {
            Object.assign(config, data);
          } else if (fileName === "responses.json") {
            // Caso especial para responses.json: copiar a ambas ubicaciones
            config.messages.responses = data.responses || {};
            config.messages.contextual = data.contextual || {};
            // Mantener también una copia a nivel raíz para compatibilidad
            Object.assign(config, data);
          } else {
            const key = fileName.replace(".json", "");
            if (key === "messages") {
              Object.assign(config.messages, data);
            } else {
              config.messages[key] = data;
            }
          }
        } catch (error) {
          logWarning(`⚠️ Error cargando archivo personalizado: ${fileName}`);
        }
      }
    } catch (error) {
      logInfo(
        "📂 No hay configuración personalizada, usando valores por defecto"
      );
    }

    return config;
  }

  private mergeConfigurations(
    defaultConfig: BotConfiguration,
    customConfig: Partial<BotConfiguration>
  ): BotConfiguration {
    const merged = JSON.parse(JSON.stringify(defaultConfig));

    return this.deepMerge(merged, customConfig);
  }

  private deepMerge(target: any, source: any): any {
    for (const key in source) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  private async saveConfigurationSection(
    fileName: string,
    data: any
  ): Promise<void> {
    const filePath = path.join(this.configPath, fileName);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private async createBackup(): Promise<void> {
    if (!this.config) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(this.managerConfig.backupPath, timestamp);

    await fs.mkdir(backupDir, { recursive: true });

    const exported = await this.exportConfiguration({
      format: "json",
      prettify: true,
      includeDefaults: false,
    });

    await fs.writeFile(
      path.join(backupDir, "configuration.json"),
      exported,
      "utf-8"
    );

    // Limpiar respaldos antiguos
    await this.cleanupOldBackups();

    logInfo(`💾 Respaldo creado: ${backupDir}`);
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupDirs = await fs.readdir(this.managerConfig.backupPath);

      if (backupDirs.length > this.managerConfig.maxBackups) {
        const sortedDirs = backupDirs.sort().reverse();
        const dirsToDelete = sortedDirs.slice(this.managerConfig.maxBackups);

        for (const dir of dirsToDelete) {
          const dirPath = path.join(this.managerConfig.backupPath, dir);
          await fs.rmdir(dirPath, { recursive: true });
          logInfo(`🗑️ Respaldo antiguo eliminado: ${dir}`);
        }
      }
    } catch (error) {
      logWarning(`⚠️ Error limpiando respaldos antiguos: ${error}`);
    }
  }

  private async setupFileWatcher(): Promise<void> {
    try {
      const { default: chokidar } = await import("chokidar");

      this.watcher = chokidar.watch(this.configPath, {
        ignored: /(^|[\/\\])\../, // ignorar archivos ocultos
        persistent: true,
      });

      this.watcher.on("change", async (filePath: string) => {
        logInfo(`📁 Archivo de configuración modificado: ${filePath}`);
        try {
          await this.reloadConfiguration();
        } catch (error) {
          logError(`❌ Error recargando tras cambio de archivo: ${error}`);
        }
      });

      this.isWatching = true;
      logInfo("👀 File watcher configurado");
    } catch (error) {
      logWarning(`⚠️ No se pudo configurar file watcher: ${error}`);
    }
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);

    if (lastKey) {
      target[lastKey] = value;
    }
  }
}

// Exportar instancia singleton
export const configurationService = new ConfigurationService();
