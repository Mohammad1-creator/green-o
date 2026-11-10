import { beforeAll, describe, expect, it } from "vitest";

import { employeeNumberToEmail } from "@/lib/auth/staff-email";

import {
  adminClient,
  anonClient,
  createTestDepartment,
  createTestUser,
  hasSupabase,
  signedInClient,
  TEST_PASSWORD,
} from "./helpers";

describe.skipIf(!hasSupabase)("sign-in and data access through the API", () => {
  let departmentA: string;
  let departmentB: string;
  let employeeA: { id: string; employeeNo: string };
  let employeeB: { id: string; employeeNo: string };
  let managerA: { id: string; employeeNo: string };

  beforeAll(async () => {
    departmentA = await createTestDepartment();
    departmentB = await createTestDepartment();
    employeeA = await createTestUser({
      role: "employee",
      departmentId: departmentA,
    });
    employeeB = await createTestUser({
      role: "employee",
      departmentId: departmentB,
    });
    managerA = await createTestUser({
      role: "maintenance_manager",
      departmentId: departmentA,
    });
  });

  it("signs in with an employee number (the reserved staff domain is accepted)", async () => {
    const client = await signedInClient(employeeA.employeeNo);
    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe(employeeA.id);
  });

  it("rejects a wrong password", async () => {
    const { error } = await anonClient().auth.signInWithPassword({
      email: employeeNumberToEmail(employeeA.employeeNo),
      password: `${TEST_PASSWORD}-wrong`,
    });
    expect(error?.code).toBe("invalid_credentials");
  });

  it("gives an anonymous visitor nothing", async () => {
    const anon = anonClient();
    const { data, error } = await anon.from("departments").select("id");
    expect(data ?? []).toEqual([]);
    expect(error?.code).toBe("42501");
  });

  it("does not let anyone sign up on their own", async () => {
    const { error } = await anonClient().auth.signUp({
      email: employeeNumberToEmail("424242"),
      password: TEST_PASSWORD,
    });
    expect(error).not.toBeNull();
  });

  it("shows an employee only their own employee details", async () => {
    const client = await signedInClient(employeeA.employeeNo);
    const { data, error } = await client
      .from("employee_details")
      .select("user_id");
    expect(error).toBeNull();
    expect(data).toEqual([{ user_id: employeeA.id }]);
  });

  it("scopes a department manager to their own department", async () => {
    const client = await signedInClient(managerA.employeeNo);
    const { data } = await client.from("employee_details").select("user_id");
    const ids = (data ?? []).map((row) => row.user_id);
    expect(ids).toContain(employeeA.id);
    expect(ids).not.toContain(employeeB.id);
  });

  it("blocks direct writes that skip the database functions", async () => {
    const client = await signedInClient(employeeA.employeeNo);
    const { error } = await client
      .from("profiles")
      .update({ role: "general_manager" })
      .eq("id", employeeA.id);
    expect(error?.code).toBe("42501");
  });

  it("blocks an employee from calling manager functions", async () => {
    const client = await signedInClient(employeeA.employeeNo);
    const { error } = await client.rpc("set_user_active", {
      p_user_id: employeeB.id,
      p_active: false,
    });
    expect(error?.code).toBe("42501");
  });

  it("refuses sign-in once the account is blocked", async () => {
    const blocked = await createTestUser({
      role: "employee",
      departmentId: departmentA,
    });
    await adminClient().auth.admin.updateUserById(blocked.id, {
      ban_duration: "876000h",
    });
    const { error } = await anonClient().auth.signInWithPassword({
      email: employeeNumberToEmail(blocked.employeeNo),
      password: TEST_PASSWORD,
    });
    expect(error?.code).toBe("user_banned");
  });

  it("keeps the bootstrap function for the service role only", async () => {
    const client = await signedInClient(employeeA.employeeNo);
    const { error } = await client.rpc("bootstrap_general_manager", {
      p_user_id: employeeA.id,
      p_full_name: "محاولة",
      p_employee_no: "1",
    });
    expect(error?.code).toBe("42501");
  });
});
