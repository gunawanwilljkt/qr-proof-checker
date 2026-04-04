import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { GET as meHandler } from "@/app/api/auth/me/route";

function makeRequest(body: unknown, cookie?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost:3000/api/auth/test", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetRequest(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost:3000/api/auth/me", { headers });
}

describe("Auth API", () => {
  beforeEach(async () => {
    await prisma.revocationLog.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.issuer.deleteMany();
  });

  it("registers a new issuer", async () => {
    const res = await registerHandler(
      makeRequest({
        name: "Test Hotel",
        email: "test@hotel.com",
        password: "securepassword123",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.issuer.name).toBe("Test Hotel");
    expect(body.issuer.email).toBe("test@hotel.com");
    expect(body.issuer.publicKey).toBeDefined();
    expect(body.issuer.passwordHash).toBeUndefined();
    expect(body.issuer.encryptedPrivateKey).toBeUndefined();
  });

  it("rejects duplicate email", async () => {
    await registerHandler(
      makeRequest({
        name: "Hotel A",
        email: "dup@hotel.com",
        password: "password123",
      })
    );
    const res = await registerHandler(
      makeRequest({
        name: "Hotel B",
        email: "dup@hotel.com",
        password: "password456",
      })
    );
    expect(res.status).toBe(409);
  });

  it("logs in and returns session cookie", async () => {
    await registerHandler(
      makeRequest({
        name: "Test Hotel",
        email: "login@hotel.com",
        password: "securepassword123",
      })
    );
    const res = await loginHandler(
      makeRequest({ email: "login@hotel.com", password: "securepassword123" })
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("session=");
  });

  it("rejects wrong password", async () => {
    await registerHandler(
      makeRequest({
        name: "Test Hotel",
        email: "wrong@hotel.com",
        password: "correct",
      })
    );
    const res = await loginHandler(
      makeRequest({ email: "wrong@hotel.com", password: "incorrect" })
    );
    expect(res.status).toBe(401);
  });

  it("GET /me returns current user with valid session", async () => {
    await registerHandler(
      makeRequest({
        name: "Me Hotel",
        email: "me@hotel.com",
        password: "password123",
      })
    );
    const loginRes = await loginHandler(
      makeRequest({ email: "me@hotel.com", password: "password123" })
    );
    const setCookie = loginRes.headers.get("Set-Cookie")!;
    const sessionValue = setCookie.split("session=")[1].split(";")[0];

    const meRes = await meHandler(
      makeGetRequest(`session=${sessionValue}`)
    );
    expect(meRes.status).toBe(200);
    const body = await meRes.json();
    expect(body.issuer.email).toBe("me@hotel.com");
  });

  it("GET /me returns 401 without session", async () => {
    const res = await meHandler(makeGetRequest());
    expect(res.status).toBe(401);
  });
});
