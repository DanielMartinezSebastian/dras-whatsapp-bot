/**
 * Simple test for ContextManagerService
 */

import { ContextManagerService } from '../src/services/context-manager.service';

describe('ContextManagerService Simple Test', () => {
  it('should be able to create an instance', () => {
    const instance = ContextManagerService.getInstance();
    expect(instance).toBeDefined();
  });
});
