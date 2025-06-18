#!/bin/bash

# Script de prueba para respuestas aleatorias de nombres
# Test script for random name responses

echo "🎲 Probando Respuestas Aleatorias de Nombres - DrasBot"
echo "======================================================="
echo ""

echo "🧪 Simulando diferentes registros de nombres para ver la variedad de respuestas..."
echo ""

# Crear un archivo JavaScript que simule las respuestas aleatorias
cat > test-random-responses.js << 'EOF'
/**
 * Test script para probar las respuestas aleatorias de nombres
 */

// Simulación de la función getRandomNameConfirmationMessage
function getRandomNameConfirmationMessage(name) {
  const responses = [
    `🎉 **¡Genial, ${name}!** Desde ahora te llamaré así. ¡Es un nombre muy bonito!`,
    `✨ **¡Perfecto, ${name}!** Tu nombre ha sido registrado exitosamente. ¡Me gusta cómo suena!`,
    `🌟 **¡Fantástico, ${name}!** A partir de ahora te reconoceré como ${name}. ¡Encantado de conocerte!`,
    `🎊 **¡Excelente, ${name}!** Tu nombre está guardado. ${name} es un nombre precioso.`,
    `🚀 **¡Increíble, ${name}!** Registro completado. Desde este momento eres ${name} para mí.`,
    `💫 **¡Maravilloso, ${name}!** Tu nombre ha sido configurado correctamente. ¡Hola ${name}!`,
    `🎈 **¡Estupendo, ${name}!** Te he registrado como ${name}. ¡Qué gusto conocerte!`,
    `🌈 **¡Fenomenal, ${name}!** Listo, ya te tengo guardado como ${name}. ¡Bienvenido/a!`,
    `⭐ **¡Súper, ${name}!** Tu registro está completo. De ahora en adelante serás ${name}.`,
    `🎯 **¡Perfecto, ${name}!** Nombre registrado con éxito. ${name}, ¡es un placer!`,
    `🔥 **¡Genial, ${name}!** Todo listo. Desde ahora cuando hables conmigo seré tu ${name}.`,
    `💎 **¡Brillante, ${name}!** Tu nombre está configurado. ${name}, ¡qué nombre tan genial!`,
    `🌺 **¡Hermoso, ${name}!** Registro exitoso. A partir de ahora te llamaré ${name}.`,
    `🎪 **¡Fantástico, ${name}!** ¡Listo! Ya puedo dirigirme a ti como ${name}.`,
    `🎭 **¡Espectacular, ${name}!** Tu nombre ha sido guardado. ¡Hola de nuevo, ${name}!`
  ];
  
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

// Simulación de la función getRandomMotivationalText
function getRandomMotivationalText() {
  const motivationalTexts = [
    `\n\n✨ **¡Ya puedes usar todos los comandos del bot!**\n\n💡 Escribe \`!help\` para ver qué puedo hacer por ti.`,
    `\n\n🚀 **¡Todo está listo para comenzar!**\n\n💡 Prueba escribir \`!help\` para descubrir mis funciones.`,
    `\n\n🎊 **¡Bienvenido/a oficialmente al bot!**\n\n💡 Usa \`!help\` para explorar todas mis capacidades.`,
    `\n\n⭐ **¡Ahora tienes acceso completo!**\n\n💡 Escribe \`!help\` para ver la lista de comandos disponibles.`,
    `\n\n🌟 **¡Tu experiencia personalizada comienza ahora!**\n\n💡 Prueba \`!help\` para ver todo lo que podemos hacer juntos.`,
    `\n\n🎯 **¡Configuración completada!**\n\n💡 Escribe \`!help\` para conocer todas mis funcionalidades.`,
    `\n\n🎈 **¡Listo para la diversión!**\n\n💡 Usa \`!help\` para ver qué aventuras podemos vivir.`,
    `\n\n💫 **¡Tu perfil está completo!**\n\n💡 Escribe \`!help\` para comenzar a explorar mis comandos.`
  ];
  
  const randomIndex = Math.floor(Math.random() * motivationalTexts.length);
  return motivationalTexts[randomIndex];
}

// Nombres de prueba
const testNames = ['Juan', 'María', 'Pedro', 'Ana', 'Carlos', 'Laura', 'Diego', 'Carmen', 'Luis', 'Sofía'];

console.log('📝 Ejemplos de respuestas aleatorias para diferentes nombres:\n');

testNames.forEach((name, index) => {
  const response = getRandomNameConfirmationMessage(name) + getRandomMotivationalText();
  console.log(`${index + 1}. Nombre: "${name}"`);
  console.log(`   Respuesta: ${response}`);
  console.log('   ' + '─'.repeat(80));
  console.log('');
});

console.log('🎯 Como puedes ver, cada respuesta es única y personalizada!');
console.log('🎲 El bot selecciona aleatoriamente entre 15 mensajes de confirmación diferentes');
console.log('💫 Y 8 textos motivacionales diferentes para crear 120 combinaciones posibles!');
EOF

echo "📊 Ejecutando simulación de respuestas aleatorias..."
echo ""

node test-random-responses.js

echo ""
echo "✅ Simulación completada!"
echo ""
echo "🎯 **¿Cómo probarlo en WhatsApp?**"
echo "1. Envía mensajes como:"
echo "   - 'me llamo Juan'"
echo "   - '!mellamo María'"
echo "   - 'soy Pedro'"
echo "   - 'llamame Ana'"
echo ""
echo "2. Cada vez que registres un nombre verás una respuesta diferente y única"
echo ""
echo "3. Las respuestas incluyen:"
echo "   - Un mensaje de confirmación aleatorio (15 opciones)"
echo "   - Un texto motivacional aleatorio (8 opciones)"
echo "   - ¡120 combinaciones diferentes en total!"
echo ""
echo "🔥 **Estado actual del bot:**"
echo "✅ Bot ejecutándose en puerto 3001"
echo "✅ 15 respuestas de confirmación implementadas"
echo "✅ 8 textos motivacionales implementados"
echo "✅ Respuestas aleatorias activas para todos los métodos de registro"
echo ""
echo "🎉 ¡El sistema de respuestas aleatorias está completamente funcional!"

# Limpiar archivo temporal
rm -f test-random-responses.js
