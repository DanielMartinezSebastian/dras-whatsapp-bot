export interface User {
  id?: number;
  whatsapp_jid: string;
  phone_number: string;
  display_name: string;
  user_type: UserType;
  created_at: Date;
  updated_at: Date;
  last_message_at?: Date;
  total_messages: number;
  is_active: boolean;
  metadata?: UserMetadata;
}

export type UserType =
  | "admin"
  | "customer"
  | "friend"
  | "familiar"
  | "employee"
  | "provider"
  | "block";

export interface UserMetadata {
  language?: string;
  timezone?: string;
  preferences?: Record<string, any>;
  registrationData?: RegistrationData;
}

export interface RegistrationData {
  needsNameRegistration: boolean;
  registrationStep?: RegistrationStep;
  temporaryData?: Record<string, any>;
}

export type RegistrationStep =
  | "awaiting_name"
  | "name_confirmation"
  | "completed";
