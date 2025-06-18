/**
 * Test for Name Registration System
 * Quick tests to verify name validation logic
 */

// Mock the validation function
function validateDisplayName(name) {
  // Remove extra whitespace
  const trimmedName = name.trim();

  // Check if empty
  if (!trimmedName) {
    return { valid: false, reason: "El nombre no puede estar vacío" };
  }

  // Check length (minimum 2, maximum 50 characters)
  if (trimmedName.length < 2) {
    return {
      valid: false,
      reason: "El nombre debe tener al menos 2 caracteres",
    };
  }

  if (trimmedName.length > 50) {
    return {
      valid: false,
      reason: "El nombre no puede tener más de 50 caracteres",
    };
  }

  // Check if it contains only numbers (phone number check)
  if (/^\d+$/.test(trimmedName)) {
    return {
      valid: false,
      reason: "El nombre no puede ser solo números (parece un teléfono)",
    };
  }

  // Check for phone number patterns (+, country codes, etc.)
  if (/^[\+]?[\d\s\-\(\)]{8,}$/.test(trimmedName)) {
    return {
      valid: false,
      reason: "El nombre no puede ser un número de teléfono",
    };
  }

  // Check for valid characters (letters, numbers, spaces, some special chars)
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\.\-_]+$/.test(trimmedName)) {
    return { valid: false, reason: "El nombre contiene caracteres no válidos" };
  }

  return { valid: true };
}

// Test cases
const testCases = [
  // Valid names
  { name: "Juan", expected: true, description: "Nombre simple válido" },
  { name: "María García", expected: true, description: "Nombre con apellido" },
  { name: "José-Luis", expected: true, description: "Nombre con guión" },
  {
    name: "Ana_23",
    expected: true,
    description: "Nombre con underscore y números",
  },
  { name: "Ñoño", expected: true, description: "Nombre con ñ" },
  { name: "José María", expected: true, description: "Nombre compuesto" },
  { name: "A.B.", expected: true, description: "Iniciales con puntos" },

  // Invalid names
  { name: "", expected: false, description: "Nombre vacío" },
  { name: " ", expected: false, description: "Solo espacios" },
  { name: "A", expected: false, description: "Muy corto (1 caracter)" },
  { name: "123456789", expected: false, description: "Solo números" },
  {
    name: "+34123456789",
    expected: false,
    description: "Número de teléfono con código",
  },
  {
    name: "(123) 456-7890",
    expected: false,
    description: "Formato teléfono US",
  },
  {
    name: "123-456-789",
    expected: false,
    description: "Formato teléfono con guiones",
  },
  {
    name: "a".repeat(51),
    expected: false,
    description: "Muy largo (más de 50 caracteres)",
  },
  { name: "Juan@gmail", expected: false, description: "Contiene @" },
  { name: "Test#123", expected: false, description: "Contiene #" },
  { name: "User$Name", expected: false, description: "Contiene $" },
];

console.log("🧪 Testing Name Validation System");
console.log("================================\n");

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  const result = validateDisplayName(testCase.name);
  const passed = result.valid === testCase.expected;

  if (passed) {
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    passedTests++;
  } else {
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.name}"`);
    console.log(`   Expected: ${testCase.expected ? "valid" : "invalid"}`);
    console.log(`   Got: ${result.valid ? "valid" : "invalid"}`);
    if (result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }
    failedTests++;
  }
});

console.log(`\n📊 Test Results:`);
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   📊 Total: ${testCases.length}`);

if (failedTests === 0) {
  console.log("\n🎉 All tests passed! Name validation is working correctly.");
} else {
  console.log("\n⚠️  Some tests failed. Please review the validation logic.");
}

console.log("\n🔍 Additional Manual Tests to Try:");
console.log('- "Me llamo Juan" (should extract "Juan")');
console.log('- "Soy María García" (should extract "María García")');
console.log('- "Llamame Pedro-Luis" (should extract "Pedro-Luis")');
console.log('- "Mi nombre es 123456" (should be rejected)');
console.log('- "+34666777888" (should be rejected as phone number)');
