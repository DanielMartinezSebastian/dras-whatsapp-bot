import * as fs from "fs";
import * as path from "path";
import { LogWatcher } from "../../services/LogWatcher";
import {
  LogWatcherConfig,
  LogEvent,
} from "../../types/services/log-watcher.types";

// Mock del logger
jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe("LogWatcher", () => {
  let logWatcher: LogWatcher;
  let testLogFile: string;
  let tempDir: string;

  beforeEach(() => {
    // Crear directorio temporal para tests
    tempDir = fs.mkdtempSync(path.join(__dirname, "logwatcher-test-"));
    testLogFile = path.join(tempDir, "test.log");

    // Crear archivo de log de prueba
    fs.writeFileSync(testLogFile, "Línea inicial\n", "utf8");
  });

  afterEach(async () => {
    // Limpiar LogWatcher
    if (logWatcher) {
      await logWatcher.close();
    }

    // Limpiar archivos temporales
    try {
      if (fs.existsSync(testLogFile)) {
        fs.unlinkSync(testLogFile);
      }
      fs.rmdirSync(tempDir);
    } catch (error) {
      // Ignorar errores de limpieza
    }
  });

  describe("constructor", () => {
    it("debe crear una instancia con configuración mínima", () => {
      const config: LogWatcherConfig = {
        logFilePath: testLogFile,
      };

      logWatcher = new LogWatcher(config);

      expect(logWatcher.config.logFilePath).toBe(testLogFile);
      expect(logWatcher.config.pollingInterval).toBe(1000);
      expect(logWatcher.config.bufferSize).toBe(64 * 1024);
      expect(logWatcher.config.readExistingOnStart).toBe(false);
      expect(logWatcher.config.encoding).toBe("utf8");
      expect(logWatcher.isWatching).toBe(false);
      expect(logWatcher.currentPosition).toBe(0);
    });

    it("debe crear una instancia con configuración personalizada", () => {
      const config: LogWatcherConfig = {
        logFilePath: testLogFile,
        pollingInterval: 500,
        bufferSize: 1024,
        readExistingOnStart: true,
        encoding: "ascii",
      };

      logWatcher = new LogWatcher(config);

      expect(logWatcher.config.pollingInterval).toBe(500);
      expect(logWatcher.config.bufferSize).toBe(1024);
      expect(logWatcher.config.readExistingOnStart).toBe(true);
      expect(logWatcher.config.encoding).toBe("ascii");
    });

    it("debe lanzar error si no se proporciona logFilePath", () => {
      expect(() => {
        logWatcher = new LogWatcher({} as LogWatcherConfig);
      }).toThrow("logFilePath es requerido en la configuración");
    });
  });

  describe("isFileValid", () => {
    it("debe retornar true para archivo válido", async () => {
      logWatcher = new LogWatcher({ logFilePath: testLogFile });

      const isValid = await logWatcher.isFileValid();
      expect(isValid).toBe(true);
    });

    it("debe retornar false para archivo inexistente", async () => {
      const invalidPath = path.join(tempDir, "nonexistent.log");
      logWatcher = new LogWatcher({ logFilePath: invalidPath });

      const isValid = await logWatcher.isFileValid();
      expect(isValid).toBe(false);
    });
  });

  describe("startWatching y stopWatching", () => {
    beforeEach(() => {
      logWatcher = new LogWatcher({ logFilePath: testLogFile });
    });

    it("debe iniciar el monitoreo correctamente", async () => {
      const startedSpy = jest.fn();
      logWatcher.on("started", startedSpy);

      await logWatcher.startWatching();

      expect(logWatcher.isWatching).toBe(true);
      expect(startedSpy).toHaveBeenCalled();
      expect(logWatcher.currentPosition).toBeGreaterThan(0); // Debería estar al final
    });

    it("debe detener el monitoreo correctamente", async () => {
      const stoppedSpy = jest.fn();
      logWatcher.on("stopped", stoppedSpy);

      await logWatcher.startWatching();
      await logWatcher.stopWatching();

      expect(logWatcher.isWatching).toBe(false);
      expect(stoppedSpy).toHaveBeenCalled();
    });

    it("debe leer archivo existente si readExistingOnStart es true", async () => {
      logWatcher = new LogWatcher({
        logFilePath: testLogFile,
        readExistingOnStart: true,
      });

      const newLogSpy = jest.fn();
      logWatcher.on("newLog", newLogSpy);

      await logWatcher.startWatching();

      expect(newLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          line: "Línea inicial",
          lineNumber: 1,
        })
      );
    });

    it("debe lanzar error si intenta iniciar monitoreo ya activo", async () => {
      await logWatcher.startWatching();

      await expect(logWatcher.startWatching()).rejects.toThrow(
        "LogWatcher ya está monitoreando"
      );
    });

    it("debe lanzar error si archivo no existe", async () => {
      const invalidPath = path.join(tempDir, "nonexistent.log");
      logWatcher = new LogWatcher({ logFilePath: invalidPath });

      await expect(logWatcher.startWatching()).rejects.toThrow(
        "Archivo de log no existe o no es accesible"
      );
    });
  });

  describe("readNewLines", () => {
    beforeEach(() => {
      logWatcher = new LogWatcher({ logFilePath: testLogFile });
    });

    it("debe leer nuevas líneas agregadas al archivo", async () => {
      await logWatcher.startWatching();

      // Agregar nueva línea
      fs.appendFileSync(testLogFile, "Nueva línea\n", "utf8");

      const events = await logWatcher.readNewLines();

      expect(events).toHaveLength(1);
      expect(events[0].line).toBe("Nueva línea");
      expect(events[0].lineNumber).toBe(1);
      expect(events[0]).toHaveProperty("timestamp");
      expect(events[0]).toHaveProperty("position");
    });

    it("debe retornar array vacío si no hay nuevas líneas", async () => {
      await logWatcher.startWatching();

      const events = await logWatcher.readNewLines();

      expect(events).toHaveLength(0);
    });

    it("debe filtrar líneas vacías por defecto", async () => {
      await logWatcher.startWatching();

      // Agregar líneas con espacios vacíos
      fs.appendFileSync(
        testLogFile,
        "\nLínea válida\n\n   \nOtra línea\n",
        "utf8"
      );

      const events = await logWatcher.readNewLines();

      expect(events).toHaveLength(2);
      expect(events[0].line).toBe("Línea válida");
      expect(events[1].line).toBe("Otra línea");
    });

    it("debe aplicar filtro regex cuando se proporciona", async () => {
      await logWatcher.startWatching();

      fs.appendFileSync(
        testLogFile,
        "ERROR: algo falló\nINFO: información\nERROR: otro error\n",
        "utf8"
      );

      const events = await logWatcher.readNewLines({
        filterPattern: /^ERROR:/,
      });

      expect(events).toHaveLength(2);
      expect(events[0].line).toBe("ERROR: algo falló");
      expect(events[1].line).toBe("ERROR: otro error");
    });

    it("debe aplicar transformador personalizado", async () => {
      await logWatcher.startWatching();

      fs.appendFileSync(testLogFile, "línea en minúsculas\n", "utf8");

      const events = await logWatcher.readNewLines({
        transformer: (line) => line.toUpperCase(),
      });

      expect(events).toHaveLength(1);
      expect(events[0].line).toBe("LÍNEA EN MINÚSCULAS");
    });
  });

  describe("readFullFile", () => {
    beforeEach(() => {
      // Crear archivo con múltiples líneas
      fs.writeFileSync(testLogFile, "Línea 1\nLínea 2\nLínea 3\n", "utf8");
      logWatcher = new LogWatcher({ logFilePath: testLogFile });
    });

    it("debe leer todo el archivo desde el inicio", async () => {
      await logWatcher.startWatching();

      const events = await logWatcher.readFullFile();

      expect(events).toHaveLength(3);
      expect(events[0].line).toBe("Línea 1");
      expect(events[1].line).toBe("Línea 2");
      expect(events[2].line).toBe("Línea 3");
    });
  });

  describe("posición y estadísticas", () => {
    beforeEach(() => {
      logWatcher = new LogWatcher({ logFilePath: testLogFile });
    });

    it("debe resetear posición correctamente", () => {
      logWatcher.setPosition(100);
      expect(logWatcher.currentPosition).toBe(100);

      logWatcher.resetPosition();
      expect(logWatcher.currentPosition).toBe(0);
    });

    it("debe establecer posición correctamente", () => {
      logWatcher.setPosition(50);
      expect(logWatcher.currentPosition).toBe(50);
    });

    it("debe lanzar error para posición negativa", () => {
      expect(() => {
        logWatcher.setPosition(-1);
      }).toThrow("La posición no puede ser negativa");
    });

    it("debe retornar estadísticas correctas", async () => {
      await logWatcher.startWatching();

      const stats = logWatcher.getStats();

      expect(stats.filePath).toBe(testLogFile);
      expect(stats.isWatching).toBe(true);
      expect(stats.startTime).toBeInstanceOf(Date);
      expect(typeof stats.currentPosition).toBe("number");
      expect(typeof stats.linesProcessed).toBe("number");
      expect(typeof stats.currentFileSize).toBe("number");
    });
  });

  describe("updateConfig", () => {
    beforeEach(() => {
      logWatcher = new LogWatcher({ logFilePath: testLogFile });
    });

    it("debe actualizar configuración cuando no está monitoreando", () => {
      logWatcher.updateConfig({ pollingInterval: 2000 });

      expect(logWatcher.config.pollingInterval).toBe(2000);
    });

    it("debe lanzar error si intenta actualizar mientras monitorea", async () => {
      await logWatcher.startWatching();

      expect(() => {
        logWatcher.updateConfig({ pollingInterval: 2000 });
      }).toThrow(
        "No se puede actualizar configuración mientras se está monitoreando"
      );
    });
  });

  describe("eventos en tiempo real", () => {
    beforeEach(() => {
      logWatcher = new LogWatcher({
        logFilePath: testLogFile,
        pollingInterval: 100, // Polling rápido para tests
      });
    });

    it("debe emitir eventos newLog cuando se agregan líneas", (done) => {
      let eventCount = 0;

      logWatcher.on("newLog", (event: LogEvent) => {
        eventCount++;

        if (eventCount === 1) {
          expect(event.line).toBe("Línea de prueba");
          done();
        }
      });

      logWatcher.startWatching().then(() => {
        // Agregar línea después de un breve delay
        setTimeout(() => {
          fs.appendFileSync(testLogFile, "Línea de prueba\n", "utf8");
        }, 50);
      });
    }, 5000);

    it("debe emitir evento fileChanged cuando el archivo cambia", (done) => {
      logWatcher.on("fileChanged", (stats) => {
        expect(stats.filePath).toBe(testLogFile);
        expect(stats.isWatching).toBe(true);
        done();
      });

      logWatcher.startWatching().then(() => {
        setTimeout(() => {
          fs.appendFileSync(testLogFile, "Cambio en archivo\n", "utf8");
        }, 50);
      });
    }, 5000);
  });

  describe("manejo de errores", () => {
    it("debe emitir evento error para archivo inválido", (done) => {
      const invalidPath = "/ruta/inexistente/archivo.log";
      logWatcher = new LogWatcher({ logFilePath: invalidPath });

      logWatcher.on("error", (error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });

      logWatcher.startWatching().catch(() => {
        // Error esperado
      });
    });
  });

  describe("close", () => {
    beforeEach(() => {
      logWatcher = new LogWatcher({ logFilePath: testLogFile });
    });

    it("debe limpiar recursos correctamente", async () => {
      await logWatcher.startWatching();
      expect(logWatcher.isWatching).toBe(true);

      await logWatcher.close();
      expect(logWatcher.isWatching).toBe(false);

      // Verificar que los listeners fueron removidos
      expect(logWatcher.listenerCount("newLog")).toBe(0);
      expect(logWatcher.listenerCount("error")).toBe(0);
    });
  });
});
