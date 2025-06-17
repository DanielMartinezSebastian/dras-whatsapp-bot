export class ContextManagerService { 
  private static instance: ContextManagerService; 
  public static getInstance(): ContextManagerService { 
    if (!ContextManagerService.instance) { 
      ContextManagerService.instance = new ContextManagerService(); 
    } 
    return ContextManagerService.instance; 
  } 
  public async initialize(): Promise<void> {} 
}
