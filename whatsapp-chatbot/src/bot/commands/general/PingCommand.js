/**
 * Comando ping para verificar la latencia del bot
 */
const Command = require("../core/Command");

class PingCommand extends Command {
  get name() {
    return "ping";
  }
  get description() {
    return "Comprueba la latencia del bot";
  }
  get syntax() {
    return "!ping";
  }
  get aliases() {
    return ["latencia", "pong"];
  }
  get category() {
    return "general";
  }
  get cooldown() {
    return 5;
  } // 5 segundos de cooldown

  async execute(message, args, bot) {
    try {
      const startTime = Date.now();

      // Enviar mensaje inicial
      const reply = await message.reply(
        this.formatResponse("🏓 Calculando latencias...", "info")
      );

      // Simular operación de base de datos
      let dbLatency = "N/A";
      if (bot.userService) {
        try {
          const dbStart = Date.now();
          await bot.userService.getServiceStats();
          dbLatency = `${Date.now() - dbStart}ms`;
        } catch (error) {
          dbLatency = "Error";
        }
      }

      const responseTime = Date.now() - startTime;
      const memoryUsage = process.memoryUsage();

      let responseText = `🏓 *Pong!*\n\n`;
      responseText += `⚡ *Latencias:*\n`;
      responseText += `• Bot: ${responseTime}ms\n`;
      responseText += `• Base de datos: ${dbLatency}\n`;
      responseText += `• Memoria libre: ${Math.round(
        (memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024
      )}MB\n\n`;
      responseText += `🔍 *Detalles:*\n`;
      responseText += `• Timestamp: ${new Date().toLocaleString()}\n`;
      responseText += `• Comando procesado por: Nuevo Sistema ✨`;

      // Si el cliente soporta edición de mensajes, usar eso, sino enviar nuevo mensaje
      if (reply && typeof reply.edit === "function") {
        await reply.edit(responseText);
      } else {
        await message.reply(responseText);
      }
    } catch (error) {
      console.error("Error en comando ping:", error);
      await message.reply(
        this.formatResponse("Error al calcular la latencia.", "error")
      );
    }
  }
}

module.exports = PingCommand;
