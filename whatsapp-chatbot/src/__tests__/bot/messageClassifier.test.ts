import { MessageClassifier } from "../../bot/core/messageClassifier";

describe("MessageClassifier Migration", () => {
  let classifier: MessageClassifier;

  beforeEach(() => {
    classifier = new MessageClassifier();
  });

  describe("Basic Classification", () => {
    it("should create classifier instance", () => {
      expect(classifier).toBeDefined();
      expect(classifier).toBeInstanceOf(MessageClassifier);
    });

    it("should classify commands correctly", () => {
      const result = classifier.classifyMessage("/help");
      expect(result.type).toBe("command");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should classify greetings correctly", () => {
      const result = classifier.classifyMessage("hola");
      expect(result.type).toBe("greeting");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should classify farewells correctly", () => {
      const result = classifier.classifyMessage("adiós");
      expect(result.type).toBe("farewell");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should classify questions correctly", () => {
      const result = classifier.classifyMessage("¿cómo estás?");
      expect(result.type).toBe("question");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should classify help requests correctly", () => {
      const result = classifier.classifyMessage("necesito ayuda");
      expect(result.type).toBe("help");
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe("Pattern Matching", () => {
    it("should identify commands", () => {
      expect(classifier.isCommand("/status")).toBe(true);
      expect(classifier.isCommand("!help")).toBe(true);
      expect(classifier.isCommand("hola")).toBe(false);
    });

    it("should identify greetings", () => {
      expect(classifier.isGreeting("hola")).toBe(true);
      expect(classifier.isGreeting("buenos días")).toBe(true);
      expect(classifier.isGreeting("adiós")).toBe(false);
    });

    it("should identify questions", () => {
      expect(classifier.isQuestion("¿qué tal?")).toBe(true);
      expect(classifier.isQuestion("cómo estás")).toBe(true);
      expect(classifier.isQuestion("hola")).toBe(false);
    });
  });

  describe("Contextual Analysis", () => {
    it("should extract contextual keywords", () => {
      const keywords = classifier.extractContextualKeywords(
        "estoy triste y aburrido"
      );
      expect(keywords).toContain("triste");
      expect(keywords).toContain("aburrido");
    });

    it("should analyze sentiment", () => {
      expect(classifier.analyzeSentiment("estoy feliz")).toBe("positive");
      expect(classifier.analyzeSentiment("estoy triste")).toBe("negative");
      expect(classifier.analyzeSentiment("hola mundo")).toBe("neutral");
    });
  });

  describe("Detailed Classification", () => {
    it("should provide detailed classification", () => {
      const result = classifier.classifyMessageDetailed("hola, ¿cómo estás?");
      expect(result.primaryType).toBe("greeting");
      expect(result.secondaryTypes).toContain("question");
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe("Configuration", () => {
    it("should update configuration", () => {
      const newConfig = { confidenceThreshold: 0.9 };
      classifier.updateConfig(newConfig);

      const patterns = classifier.getPatterns();
      expect(patterns).toBeDefined();
      expect(patterns.greetingPatterns).toBeDefined();
    });
  });
});
