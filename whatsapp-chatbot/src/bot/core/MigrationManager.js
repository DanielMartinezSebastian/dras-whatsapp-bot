const { logInfo, logWarning, logError } = require("../../utils/logger");

/**
 * Gestor de migración gradual legacy → modular
 */
class MigrationManager {
  constructor(botProcessor) {
    this.botProcessor = botProcessor;
    this.config = {
      enableLegacyFallback: true,
      migrationMode: "gradual", // 'gradual', 'complete', 'legacy-only'
      failureThreshold: 3,
    };

    this.commandStatus = new Map();
    this.metrics = {
      newSystemSuccess: 0,
      legacyFallbacks: 0,
      migrationFailures: 0,
      commandsFullyMigrated: 0,
    };
  }

  /**
   * Determina qué sistema usar para un comando
   */
  shouldUseNewSystem(commandName) {
    const status = this.commandStatus.get(commandName);

    if (!status) {
      return this.config.migrationMode !== "legacy-only";
    }

    return (
      status.useNewSystem && status.failures < this.config.failureThreshold
    );
  }

  /**
   * Registra resultado de ejecución
   */
  recordCommandExecution(commandName, system, success, error = null) {
    const status = this.commandStatus.get(commandName) || {
      useNewSystem: true,
      failures: 0,
      successCount: 0,
      lastFailure: null,
    };

    if (system === "new") {
      if (success) {
        status.successCount++;
        status.failures = 0;
        this.metrics.newSystemSuccess++;
      } else {
        status.failures++;
        status.lastFailure = { error, timestamp: new Date() };
        this.metrics.migrationFailures++;

        if (status.failures >= this.config.failureThreshold) {
          status.useNewSystem = false;
          logWarning(`Comando ${commandName} deshabilitado en nuevo sistema`);
        }
      }
    } else {
      this.metrics.legacyFallbacks++;
    }

    this.commandStatus.set(commandName, status);
  }

  /**
   * Marca comando como completamente migrado
   */
  markCommandAsMigrated(commandName) {
    const status = this.commandStatus.get(commandName);
    if (status) {
      status.fullyMigrated = true;
      status.useNewSystem = true;
      this.metrics.commandsFullyMigrated++;

      logInfo(`Comando ${commandName} marcado como completamente migrado`);
    }
  }

  /**
   * Obtiene estadísticas de migración
   */
  getMigrationStats() {
    const totalCommands = this.commandStatus.size;
    const migratedCommands = Array.from(this.commandStatus.values()).filter(
      (status) => status.fullyMigrated
    ).length;

    return {
      ...this.metrics,
      totalCommands,
      migratedCommands,
      migrationProgress:
        totalCommands > 0 ? (migratedCommands / totalCommands) * 100 : 0,
    };
  }

  /**
   * Configurar modo de migración
   */
  setMigrationMode(mode) {
    this.config.migrationMode = mode;
    logInfo(`Modo de migración cambiado a: ${mode}`);
  }

  /**
   * Obtener lista de comandos por estado
   */
  getCommandsByStatus() {
    const result = {
      migrated: [],
      pending: [],
      failed: [],
    };

    for (const [commandName, status] of this.commandStatus.entries()) {
      if (status.fullyMigrated) {
        result.migrated.push(commandName);
      } else if (status.failures >= this.config.failureThreshold) {
        result.failed.push(commandName);
      } else {
        result.pending.push(commandName);
      }
    }

    return result;
  }

  /**
   * Reiniciar estado de un comando
   */
  resetCommandStatus(commandName) {
    this.commandStatus.delete(commandName);
    logInfo(`Estado del comando ${commandName} reiniciado`);
  }
}

module.exports = MigrationManager;
