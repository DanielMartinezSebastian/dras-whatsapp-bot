/// <reference types="jest" />

import { WhatsAppBridgeClient } from "../../bridge/client";
import { BridgeClientError } from "../../bridge/error";
import { DEFAULT_CONFIG, validateConfig } from "../../bridge/config";
import * as utils from "../../bridge/utils";
import axios from "axios";

// Mock axios
jest.mock("axios");

// Mock logger functions
jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

describe("WhatsAppBridgeClient", () => {
  let client: WhatsAppBridgeClient;
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    },
    defaults: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios.create to return our mocked instance
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    client = new WhatsAppBridgeClient({
      enableLogging: false,
    });
  });

  afterEach(async () => {
    await client.destroy();
  });

  describe("Constructor", () => {
    it("should initialize with default config", () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe(DEFAULT_CONFIG.baseUrl);
      expect(config.timeout).toBe(DEFAULT_CONFIG.timeout);
    });

    it("should accept custom config", () => {
      const customClient = new WhatsAppBridgeClient({
        baseUrl: "http://custom:9090",
        timeout: 5000,
      });

      const config = customClient.getConfig();
      expect(config.baseUrl).toBe("http://custom:9090");
      expect(config.timeout).toBe(5000);
    });
  });

  describe("sendMessage", () => {
    it("should send text message successfully", async () => {
      const mockResponse = {
        data: { success: true, message: "Message sent" },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendMessage("1234567890", "Hello World");

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/send", {
        recipient: "1234567890",
        message: "Hello World",
      });
    });

    it("should handle send message error", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("Network error"));

      await expect(client.sendMessage("1234567890", "Hello")).rejects.toThrow(
        BridgeClientError
      );
    });
  });

  describe("sendMedia", () => {
    it("should send media message successfully", async () => {
      const mockResponse = {
        data: { success: true, message: "Media sent" },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendMedia(
        "1234567890",
        "/path/to/image.jpg",
        "Check this out"
      );

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/send", {
        recipient: "1234567890",
        message: "Check this out",
        media_path: "/path/to/image.jpg",
      });
    });
  });

  describe("downloadMedia", () => {
    it("should download media successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            filename: "image.jpg",
            path: "/downloads/image.jpg",
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.downloadMedia(
        "msg123",
        "chat456@s.whatsapp.net"
      );

      expect(result.success).toBe(true);
      expect(result.data?.filename).toBe("image.jpg");
    });
  });

  describe("ping", () => {
    it("should return true when bridge is available", async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      const isAvailable = await client.ping();

      expect(isAvailable).toBe(true);
    });

    it('should return true when bridge responds with "Recipient is required"', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: "Recipient is required",
        },
      };
      const bridgeError = new BridgeClientError(axiosError);
      mockAxiosInstance.post.mockRejectedValue(bridgeError);

      const isAvailable = await client.ping();

      expect(isAvailable).toBe(true);
    });

    it("should return false when bridge is not available", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("Connection refused"));

      const isAvailable = await client.ping();

      expect(isAvailable).toBe(false);
    });
  });
});

describe("BridgeClientError", () => {
  it("should create error from axios error", () => {
    const axiosError = {
      response: {
        status: 404,
        data: "Not found",
      },
    };

    const error = new BridgeClientError(axiosError, "testOperation");

    expect(error.code).toBe("HTTP_404");
    expect(error.message).toBe("Not found");
    expect(error.operation).toBe("testOperation");
  });

  it("should identify connection errors", () => {
    const connectionError = {
      message: "Connection refused",
      code: "ECONNREFUSED",
    };

    const error = new BridgeClientError(connectionError);

    expect(error.isConnectionError()).toBe(true);
    expect(error.isRetryable()).toBe(true);
  });
});

describe("Config validation", () => {
  it("should validate valid config", () => {
    const errors = validateConfig({
      baseUrl: "http://localhost:8080",
      timeout: 5000,
      retries: 2,
    });

    expect(errors).toHaveLength(0);
  });

  it("should detect invalid URL", () => {
    const errors = validateConfig({
      baseUrl: "invalid-url",
    });

    expect(errors).toContain("baseUrl must be a valid URL");
  });

  it("should detect invalid timeout", () => {
    const errors = validateConfig({
      timeout: 500, // Too low
    });

    expect(errors).toContain("timeout must be between 1000 and 300000 ms");
  });
});

describe("Utils", () => {
  describe("isValidPhoneNumber", () => {
    it("should validate correct phone numbers", () => {
      expect(utils.isValidPhoneNumber("1234567890")).toBe(true);
      expect(utils.isValidPhoneNumber("52123456789")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(utils.isValidPhoneNumber("123")).toBe(false);
      expect(utils.isValidPhoneNumber("abc123")).toBe(false);
    });
  });

  describe("formatPhoneNumber", () => {
    it("should format phone number correctly", () => {
      expect(utils.formatPhoneNumber("1234567890")).toBe("521234567890");
      expect(utils.formatPhoneNumber("+52 123 456 7890")).toBe("521234567890");
    });
  });

  describe("JID utilities", () => {
    it("should identify group JIDs", () => {
      expect(utils.isGroupJid("123456@g.us")).toBe(true);
      expect(utils.isGroupJid("123456@s.whatsapp.net")).toBe(false);
    });

    it("should create JID from phone", () => {
      expect(utils.createJidFromPhone("1234567890")).toBe(
        "521234567890@s.whatsapp.net"
      );
    });

    it("should extract phone from JID", () => {
      expect(utils.extractPhoneFromJid("1234567890@s.whatsapp.net")).toBe(
        "1234567890"
      );
    });
  });

  describe("parseCommand", () => {
    it("should parse commands correctly", () => {
      const result = utils.parseCommand("/help arg1 arg2");
      expect(result.command).toBe("help");
      expect(result.args).toEqual(["arg1", "arg2"]);
    });

    it("should handle non-commands", () => {
      const result = utils.parseCommand("hello world");
      expect(result.command).toBe("");
      expect(result.args).toEqual([]);
    });
  });
});
