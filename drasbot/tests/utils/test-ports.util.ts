/**
 * Test Utilities for Dynamic Port Assignment
 */

import { createServer } from 'net';

/**
 * Finds an available port starting from the given port
 */
export const findAvailablePort = async (startPort: number = 3000): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer();
    
    server.listen(startPort, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
};

/**
 * Setup function to configure test environment variables with dynamic ports
 */
export const setupTestPorts = async () => {
  const webhookPort = await findAvailablePort(3000);
  const bridgePort = await findAvailablePort(8080);
  
  // Set environment variables for testing
  process.env.WEBHOOK_PORT = webhookPort.toString();
  process.env.BRIDGE_PORT = bridgePort.toString();
  process.env.NODE_ENV = 'test';
  
  return {
    webhookPort,
    bridgePort,
  };
};

/**
 * Cleanup function to reset test environment
 */
export const cleanupTestPorts = () => {
  delete process.env.WEBHOOK_PORT;
  delete process.env.BRIDGE_PORT;
  delete process.env.NODE_ENV;
};
