import { MessageInfo, ChatInfo, MessageType } from './types';

/**
 * Utilidades para trabajar con el WhatsApp Bridge
 */

/**
 * Validar formato de número de teléfono
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Formato básico: solo números, entre 8 y 15 dígitos
  const phoneRegex = /^\d{8,15}$/;
  return phoneRegex.test(phone.replace(/[^\d]/g, ''));
}

/**
 * Formatear número de teléfono para WhatsApp
 */
export function formatPhoneNumber(phone: string): string {
  // Remover todos los caracteres no numéricos
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Si no tiene código de país, asumir que es nacional (ejemplo: México +52)
  if (cleaned.length === 10) {
    return `52${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Verificar si un JID es de un grupo
 */
export function isGroupJid(jid: string): boolean {
  return jid.includes('@g.us');
}

/**
 * Verificar si un JID es de un contacto individual
 */
export function isContactJid(jid: string): boolean {
  return jid.includes('@s.whatsapp.net');
}

/**
 * Extraer número de teléfono de un JID
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0];
}

/**
 * Crear JID a partir de número de teléfono
 */
export function createJidFromPhone(phone: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  return `${formattedPhone}@s.whatsapp.net`;
}

/**
 * Determinar tipo de mensaje basado en contenido y metadata
 */
export function getMessageType(message: MessageInfo): MessageType {
  if (message.media_type) {
    switch (message.media_type) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'audio':
        return 'audio';
      case 'document':
        return 'document';
      default:
        return 'text';
    }
  }
  return 'text';
}

/**
 * Verificar si un mensaje tiene multimedia
 */
export function hasMedia(message: MessageInfo): boolean {
  return !!message.media_type && message.media_type !== 'text';
}

/**
 * Obtener extensión de archivo basada en tipo de media
 */
export function getFileExtension(mediaType: string, filename?: string): string {
  if (filename) {
    const ext = filename.split('.').pop();
    if (ext) return ext.toLowerCase();
  }

  switch (mediaType) {
    case 'image':
      return 'jpg';
    case 'video':
      return 'mp4';
    case 'audio':
      return 'ogg';
    case 'document':
      return 'pdf';
    default:
      return 'bin';
  }
}

/**
 * Verificar si un archivo es una imagen
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? imageExtensions.includes(ext) : false;
}

/**
 * Verificar si un archivo es un video
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? videoExtensions.includes(ext) : false;
}

/**
 * Verificar si un archivo es audio
 */
export function isAudioFile(filename: string): boolean {
  const audioExtensions = ['ogg', 'mp3', 'wav', 'aac', 'm4a', 'flac'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? audioExtensions.includes(ext) : false;
}

/**
 * Formatear timestamp a fecha legible
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return timestamp;
  }
}

/**
 * Calcular tiempo transcurrido desde un timestamp
 */
export function getTimeAgo(timestamp: string): string {
  try {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'hace un momento';
    }
  } catch {
    return 'tiempo desconocido';
  }
}

/**
 * Limpiar texto de mensaje (remover caracteres especiales, etc.)
 */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/[\x00-\x1F\x7F]/g, '') // Remover caracteres de control
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
}

/**
 * Truncar mensaje a longitud específica
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Verificar si un mensaje es un comando (empieza con /)
 */
export function isCommand(message: string): boolean {
  return message.trim().startsWith('/');
}

/**
 * Extraer comando y argumentos de un mensaje
 */
export function parseCommand(message: string): { command: string; args: string[] } {
  const trimmed = message.trim();
  if (!trimmed.startsWith('/')) {
    return { command: '', args: [] };
  }

  const parts = trimmed.substring(1).split(/\s+/);
  const command = parts[0] || '';
  const args = parts.slice(1);

  return { command, args };
}