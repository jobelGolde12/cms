import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMailgunConfig,
  isEmailConfigured,
  passwordResetEmail,
  sendMail,
} from "@/lib/email";

const ENV = {
  MAILGUN_API_KEY: "key-test",
  MAILGUN_DOMAIN: "mg.example.org",
  MAILGUN_FROM_EMAIL: "no-reply@mg.example.org",
} as Record<string, string | undefined>;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Mailgun configuration", () => {
  it("requires the key, domain and sender", () => {
    expect(getMailgunConfig({})).toBeNull();
    expect(getMailgunConfig({ MAILGUN_API_KEY: "k" })).toBeNull();
    expect(getMailgunConfig({ MAILGUN_API_KEY: "k", MAILGUN_DOMAIN: "d" })).toBeNull();
    expect(getMailgunConfig({ MAILGUN_API_KEY: " ", MAILGUN_DOMAIN: "d", MAILGUN_FROM_EMAIL: "f" })).toBeNull();
    expect(isEmailConfigured(ENV)).toBe(true);
    expect(isEmailConfigured({})).toBe(false);
  });

  it("builds the US endpoint by default and the EU endpoint on demand", () => {
    expect(getMailgunConfig(ENV)?.endpoint).toBe(
      "https://api.mailgun.net/v3/mg.example.org/messages",
    );
    expect(getMailgunConfig({ ...ENV, MAILGUN_REGION: "EU" })?.endpoint).toBe(
      "https://api.eu.mailgun.net/v3/mg.example.org/messages",
    );
  });

  it("defaults the sender display name to the school", () => {
    expect(getMailgunConfig(ENV)?.fromName).toContain("Sta. Magdalena");
    expect(
      getMailgunConfig({ ...ENV, MAILGUN_FROM_NAME: "Records" })?.fromName,
    ).toBe("Records");
  });
});

describe("sendMail", () => {
  it("fails safely without configuration and never calls the network", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const previous = {
      key: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      from: process.env.MAILGUN_FROM_EMAIL,
    };
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    delete process.env.MAILGUN_FROM_EMAIL;

    const result = await sendMail({ to: "a@b.co", subject: "s", text: "t", html: "h" });
    expect(result).toEqual({ delivered: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();

    Object.assign(process.env, {
      ...(previous.key ? { MAILGUN_API_KEY: previous.key } : {}),
      ...(previous.domain ? { MAILGUN_DOMAIN: previous.domain } : {}),
      ...(previous.from ? { MAILGUN_FROM_EMAIL: previous.from } : {}),
    });
  });

  it("posts form-encoded content with basic auth and never logs the key", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "key-test");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.org");
    vi.stubEnv("MAILGUN_FROM_EMAIL", "no-reply@mg.example.org");
    vi.stubEnv("MAILGUN_FROM_NAME", "");
    vi.stubEnv("MAILGUN_REGION", "");

    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "<msg@mg>" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await sendMail({
      to: "teacher@school.edu",
      subject: "Reset your password",
      text: "plain body",
      html: "<p>html body</p>",
    });

    expect(result).toEqual({ delivered: true, providerId: "<msg@mg>" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.mailgun.net/v3/mg.example.org/messages");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("api:key-test").toString("base64")}`,
    );
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

    const body = new URLSearchParams(String(init?.body));
    expect(body.get("to")).toBe("teacher@school.edu");
    expect(body.get("subject")).toBe("Reset your password");
    expect(body.get("text")).toBe("plain body");
    expect(body.get("html")).toBe("<p>html body</p>");
    expect(body.get("from")).toContain("<no-reply@mg.example.org>");

    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("key-test");
    vi.unstubAllEnvs();
  });

  it("reports provider errors without leaking the response body", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "key-test");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.org");
    vi.stubEnv("MAILGUN_FROM_EMAIL", "no-reply@mg.example.org");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Forbidden" }), { status: 401 }),
    );

    const result = await sendMail({ to: "a@b.co", subject: "s", text: "t", html: "h" });
    expect(result).toEqual({ delivered: false, reason: "provider_error" });

    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain("Forbidden");
    expect(logged).not.toContain("key-test");
    expect(logged).not.toContain("a@b.co");
    vi.unstubAllEnvs();
  });

  it("maps network failures to a provider error", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "key-test");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.org");
    vi.stubEnv("MAILGUN_FROM_EMAIL", "no-reply@mg.example.org");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const result = await sendMail({ to: "a@b.co", subject: "s", text: "t", html: "h" });
    expect(result).toEqual({ delivered: false, reason: "provider_error" });
    vi.unstubAllEnvs();
  });
});

describe("passwordResetEmail", () => {
  const url = "https://school.example.org/reset-password?token=abc123";

  it("includes subject, plain-text fallback and the reset URL", () => {
    const mail = passwordResetEmail(url, { fullName: "Juan Dela Cruz" });
    expect(mail.subject).toMatch(/reset/i);
    expect(mail.text).toContain(url);
    expect(mail.text).toContain("expires in 30 minutes");
    expect(mail.text).toContain("used only once");
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.html).toContain("Reset Password");
    expect(mail.html).toContain("Hello Juan Dela Cruz,");
  });

  it("escapes the greeting to keep HTML injection out", () => {
    const mail = passwordResetEmail(url, { fullName: "<script>x</script>" });
    expect(mail.html).not.toContain("<script>x</script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});
