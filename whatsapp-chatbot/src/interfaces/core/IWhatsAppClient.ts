import { WhatsAppMessage } from "../../types/core";

export interface IWhatsAppClient {
  initialize(): Promise<boolean>;
  isReady(): boolean;
  sendMessage(chatId: string, message: string): Promise<boolean>;
  sendImage(
    chatId: string,
    imagePath: string,
    caption?: string
  ): Promise<boolean>;
  sendDocument(
    chatId: string,
    documentPath: string,
    filename?: string
  ): Promise<boolean>;
  getContacts(): Promise<any[]>;
  getChatById(chatId: string): Promise<any>;
  onMessage(callback: (message: WhatsAppMessage) => void): void;
  onReady(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
}
