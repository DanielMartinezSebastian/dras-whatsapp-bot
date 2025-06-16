/**
 * WhatsApp Bridge Client
 *
 * Cliente TypeScript completamente tipado para comunicarse
 * con el WhatsApp Bridge escrito en Go.
 */

// Cliente principal
export { WhatsAppBridgeClient } from "./client";

// Tipos
export type {
  BridgeClientConfig,
  BridgeResponse,
  BridgeStatus,
  BridgeError,
  SendMessageRequest,
  SendMessageResponse,
  DownloadMediaRequest,
  DownloadMediaResponse,
  MessageInfo,
  ChatInfo,
  MessageType,
  ChatType,
  MessageFilters,
} from "./types";

// Error handling
export { BridgeClientError } from "./error";

// Configuraciones
export {
  DEFAULT_CONFIG,
  DEVELOPMENT_CONFIG,
  PRODUCTION_CONFIG,
  TEST_CONFIG,
  getConfigForEnvironment,
  validateConfig,
} from "./config";

// Utilidades
export * as BridgeUtils from "./utils";

// Re-export default para facilitar imports
export { WhatsAppBridgeClient as default } from "./client";
