import { MessageProcessor } from "../../services/MessageProcessor";
import {
  MessageProcessorConfig,
  ProcessMessageOptions,
} from "../../types/services/message-processor.types";

describe("MessageProcessor", () => {
  let messageProcessor: MessageProcessor;

  beforeEach(() => {
    messageProcessor = new MessageProcessor();
  });

  afterEach(() => {
    messageProcessor.cleanup();
  });

  describe("constructor", () => {
    it("debe crear una instancia con configuración por defecto", () => {
      const processor = new MessageProcessor();
      const config = processor.getConfig();

      expect(config.normalize).toBe(true);
      expect(config.removeSpecialChars).toBe(false);
      expect(config.processEmojis).toBe(false);
      expect(config.maxLength).toBe(1000);
      expect(config.filterWords).toEqual([]);
      expect(config.preserveMultipleSpaces).toBe(false);
    });

    it("debe crear una instancia con configuración personalizada", () => {
      const customConfig: MessageProcessorConfig = {
        normalize: false,
        removeSpecialChars: true,
        processEmojis: true,
        maxLength: 500,
        filterWords: ["test"],
        preserveMultipleSpaces: true,
      };

      const processor = new MessageProcessor(customConfig);
      const config = processor.getConfig();

      expect(config.normalize).toBe(false);
      expect(config.removeSpecialChars).toBe(true);
      expect(config.processEmojis).toBe(true);
      expect(config.maxLength).toBe(500);
      expect(config.filterWords).toEqual(["test"]);
      expect(config.preserveMultipleSpaces).toBe(true);
    });
  });

  describe("processMessage", () => {
    it("debe procesar un mensaje simple correctamente", async () => {
      const message = "  Hola Mundo  ";
      const result = await messageProcessor.processMessage(message);

      expect(result.original).toBe(message);
      expect(result.processed).toBe("hola mundo");
      expect(result.wasModified).toBe(true);
      expect(result.originalLength).toBe(message.length);
      expect(result.processedLength).toBe("hola mundo".length);
    });

    it("debe normalizar espacios múltiples por defecto", async () => {
      const message = "Hola    mundo   con   espacios";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed).toBe("hola mundo con espacios");
      expect(result.metadata.operationsApplied).toContain("normalizeSpaces");
    });

    it("debe preservar espacios múltiples cuando está configurado", async () => {
      messageProcessor.updateConfig({ preserveMultipleSpaces: true });
      const message = "Hola    mundo   con   espacios";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed).toBe("hola    mundo   con   espacios");
      expect(result.metadata.operationsApplied).not.toContain(
        "normalizeSpaces"
      );
    });

    it("debe remover caracteres especiales cuando está configurado", async () => {
      messageProcessor.updateConfig({ removeSpecialChars: true });
      const message = "Hola! ¿Cómo estás? #hashtag @usuario";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed).toBe("hola cómo estás hashtag usuario");
      expect(result.metadata.operationsApplied).toContain("removeSpecialChars");
    });

    it("debe procesar emojis cuando está configurado", async () => {
      messageProcessor.updateConfig({ processEmojis: true });
      const message = "Hola 😀 estoy feliz 😂";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed).toBe("hola [feliz] estoy feliz [risa]");
      expect(result.metadata.operationsApplied).toContain("processEmojis");
    });

    it("debe filtrar palabras específicas", async () => {
      messageProcessor.updateConfig({ filterWords: ["malo", "feo"] });
      const message = "Este es un mensaje malo y feo";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed).toBe("este es un mensaje *** y ***");
      expect(result.metadata.operationsApplied).toContain("filterWords");
    });

    it("debe truncar mensajes largos", async () => {
      messageProcessor.updateConfig({ maxLength: 10 });
      const message = "Este es un mensaje muy largo que debería ser truncado";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed.length).toBe(10);
      expect(result.metadata.operationsApplied).toContain("truncate");
      expect(result.metadata.warnings).toContain(
        "Mensaje truncado a 10 caracteres"
      );
    });

    it("debe aplicar transformadores por defecto (URLs)", async () => {
      const message = "Visita https://example.com para más info";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed).toBe("visita [url] para más info");
    });

    it("debe aplicar transformadores por defecto (teléfonos)", async () => {
      const message = "Llama al +34 123 456 789";
      const result = await messageProcessor.processMessage(message);

      expect(result.processed).toBe("llama al [telefono]");
    });

    it("debe incluir metadatos cuando se solicita", async () => {
      const options: ProcessMessageOptions = { includeMetadata: true };
      const message = "  Hola Mundo  ";
      const result = await messageProcessor.processMessage(message, options);

      expect(result.metadata.timestamp).toBeInstanceOf(Date);
      expect(result.metadata.operationsApplied).toContain("normalize");
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.metadata.warnings)).toBe(true);
    });

    it("debe aplicar configuración específica en opciones", async () => {
      const options: ProcessMessageOptions = {
        config: { normalize: false, maxLength: 5 },
      };
      const message = "  Hola Mundo  ";
      const result = await messageProcessor.processMessage(message, options);

      expect(result.processed).toBe("  Hol");
      expect(result.metadata.operationsApplied).toContain("truncate");
    });

    it("debe validar mensaje cuando se solicita", async () => {
      const options: ProcessMessageOptions = { validate: true };

      await expect(
        messageProcessor.processMessage("", options)
      ).rejects.toThrow("Mensaje inválido para procesamiento");
    });

    it("debe manejar errores durante el procesamiento", async () => {
      // Agregar un transformador que lance error
      messageProcessor.addTransformer({
        name: "errorTransformer",
        transform: () => {
          throw new Error("Error de prueba");
        },
      });

      await expect(messageProcessor.processMessage("test")).rejects.toThrow(
        "Error procesando mensaje"
      );
    });
  });

  describe("processMessagesBatch", () => {
    it("debe procesar múltiples mensajes correctamente", async () => {
      const messages = ["  Hola  ", "  Mundo  ", "  Test  "];
      const results = await messageProcessor.processMessagesBatch(messages);

      expect(results).toHaveLength(3);
      expect(results[0].processed).toBe("hola");
      expect(results[1].processed).toBe("mundo");
      expect(results[2].processed).toBe("test");
    });

    it("debe manejar errores en batch sin fallar completamente", async () => {
      // Agregar un transformador que falle con mensajes específicos
      messageProcessor.addTransformer({
        name: "conditionalError",
        transform: (msg: string) => {
          if (msg.includes("error")) {
            throw new Error("Error condicional");
          }
          return msg;
        },
      });

      const messages = ["mensaje ok", "mensaje con error", "otro ok"];
      const results = await messageProcessor.processMessagesBatch(messages);

      expect(results).toHaveLength(3);
      expect(results[0].processed).toBe("mensaje ok");
      expect(results[1].processed).toBe("mensaje con error"); // Sin procesar por error
      expect(results[1].metadata.warnings[0]).toContain("Error procesando");
      expect(results[2].processed).toBe("otro ok");
    });
  });

  describe("validateMessage", () => {
    it("debe validar mensajes correctos", () => {
      expect(messageProcessor.validateMessage("Hola mundo")).toBe(true);
      expect(messageProcessor.validateMessage("123")).toBe(true);
      expect(messageProcessor.validateMessage("a")).toBe(true);
    });

    it("debe rechazar mensajes inválidos", () => {
      expect(messageProcessor.validateMessage("")).toBe(false);
      expect(messageProcessor.validateMessage("a".repeat(10001))).toBe(false);
      // @ts-ignore - Probar con tipo incorrecto
      expect(messageProcessor.validateMessage(null)).toBe(false);
      // @ts-ignore - Probar con tipo incorrecto
      expect(messageProcessor.validateMessage(undefined)).toBe(false);
      // @ts-ignore - Probar con tipo incorrecto
      expect(messageProcessor.validateMessage(123)).toBe(false);
    });
  });

  describe("configuración", () => {
    it("debe obtener configuración actual", () => {
      const config = messageProcessor.getConfig();
      expect(typeof config).toBe("object");
      expect(config.normalize).toBeDefined();
    });

    it("debe actualizar configuración", () => {
      const newConfig = { normalize: false, maxLength: 50 };
      messageProcessor.updateConfig(newConfig);

      const config = messageProcessor.getConfig();
      expect(config.normalize).toBe(false);
      expect(config.maxLength).toBe(50);
    });
  });

  describe("filtros personalizados", () => {
    it("debe agregar y aplicar filtros personalizados", async () => {
      messageProcessor.addFilter({
        name: "testFilter",
        predicate: (msg) => msg.includes("test"),
        transform: (msg) => msg.replace("test", "TEST"),
      });

      const result = await messageProcessor.processMessage("Este es un test");
      expect(result.processed).toBe("este es un TEST");
    });

    it("debe remover filtros personalizados", async () => {
      messageProcessor.addFilter({
        name: "testFilter",
        predicate: (msg) => msg.includes("test"),
        transform: (msg) => msg.replace("test", "TEST"),
      });

      messageProcessor.removeFilter("testFilter");

      const result = await messageProcessor.processMessage("Este es un test");
      expect(result.processed).toBe("este es un test");
    });
  });

  describe("transformadores personalizados", () => {
    it("debe agregar y aplicar transformadores personalizados", async () => {
      messageProcessor.addTransformer({
        name: "testTransformer",
        transform: (msg) => msg.replace("hola", "HOLA"),
      });

      const result = await messageProcessor.processMessage("hola mundo");
      expect(result.processed).toBe("HOLA mundo");
    });

    it("debe aplicar transformadores según prioridad", async () => {
      messageProcessor.addTransformer({
        name: "transformer1",
        transform: (msg) => msg + " [1]",
        priority: 2,
      });

      messageProcessor.addTransformer({
        name: "transformer2",
        transform: (msg) => msg + " [2]",
        priority: 1,
      });

      const result = await messageProcessor.processMessage("test");
      expect(result.processed).toBe("test [url] [telefono] [2] [1]");
    });

    it("debe remover transformadores personalizados", async () => {
      messageProcessor.addTransformer({
        name: "testTransformer",
        transform: (msg) => msg.replace("hola", "HOLA"),
      });

      messageProcessor.removeTransformer("testTransformer");

      const result = await messageProcessor.processMessage("hola mundo");
      expect(result.processed).toBe("hola mundo");
    });
  });

  describe("estadísticas", () => {
    it("debe rastrear estadísticas de procesamiento", async () => {
      await messageProcessor.processMessage("Hola mundo");
      await messageProcessor.processMessage("  Otro mensaje  ");

      const stats = messageProcessor.getStats();
      expect(stats.totalProcessed).toBe(2);
      expect(stats.totalCharactersProcessed).toBeGreaterThan(0);
      expect(stats.modifiedMessages).toBe(2);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(stats.lastProcessedAt).toBeInstanceOf(Date);
    });

    it("debe resetear estadísticas", async () => {
      await messageProcessor.processMessage("test");
      messageProcessor.resetStats();

      const stats = messageProcessor.getStats();
      expect(stats.totalProcessed).toBe(0);
      expect(stats.totalCharactersProcessed).toBe(0);
      expect(stats.modifiedMessages).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.lastProcessedAt).toBeUndefined();
    });
  });

  describe("cleanup", () => {
    it("debe limpiar recursos correctamente", async () => {
      messageProcessor.addFilter({
        name: "testFilter",
        predicate: () => true,
      });

      messageProcessor.addTransformer({
        name: "testTransformer",
        transform: (msg) => msg,
      });

      await messageProcessor.processMessage("test");

      messageProcessor.cleanup();

      const stats = messageProcessor.getStats();
      expect(stats.totalProcessed).toBe(0);

      // Los filtros y transformadores deberían estar limpiados
      const result = await messageProcessor.processMessage("test filter");
      expect(result.processed).toBe("test filter"); // Sin transformaciones personalizadas
    });
  });
});
