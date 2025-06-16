import { SimpleUserService, SimplePermissionService } from "./simple-services";

describe("Simple Service Test", () => {
  it("should import and instantiate SimpleUserService", () => {
    const service = new SimpleUserService();
    expect(service).toBeDefined();
    expect(service.getName()).toBe("SimpleUserService");
  });

  it("should import and instantiate SimplePermissionService", () => {
    const service = new SimplePermissionService();
    expect(service).toBeDefined();
    expect(service.getName()).toBe("SimplePermissionService");
  });
});
