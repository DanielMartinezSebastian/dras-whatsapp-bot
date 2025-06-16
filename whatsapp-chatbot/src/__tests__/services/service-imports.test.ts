import { UserService } from "../../services/userService";
import { PermissionService } from "../../services/permissionService";

describe("Service Import Diagnostics", () => {
  it("should import UserService correctly", () => {
    console.log("UserService:", UserService);
    console.log("UserService type:", typeof UserService);
    console.log("UserService prototype:", UserService.prototype);

    expect(UserService).toBeDefined();
    expect(typeof UserService).toBe("function");
  });

  it("should import PermissionService correctly", () => {
    console.log("PermissionService:", PermissionService);
    console.log("PermissionService type:", typeof PermissionService);
    console.log("PermissionService prototype:", PermissionService.prototype);

    expect(PermissionService).toBeDefined();
    expect(typeof PermissionService).toBe("function");
  });

  it("should be able to instantiate UserService", () => {
    expect(() => new UserService()).not.toThrow();
  });

  it("should be able to instantiate PermissionService", () => {
    expect(() => new PermissionService()).not.toThrow();
  });
});
