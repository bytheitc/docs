// The HTTP half, against a stubbed fetch — these check the requests this SDK builds, not a real
// server (accounts/api's own tests cover what the server does with them).
import { strict as assert } from "node:assert";
import test from "node:test";

import { buildAuthorizeUrl, exchangeCode, OAuthHttpError, type DiscoveryDocument } from "../src/client.js";

const DISCOVERY: DiscoveryDocument = {
  issuer: "https://id.itc.example",
  authorization_endpoint: "https://id.itc.example/oauth/authorize",
  token_endpoint: "https://id.itc.example/oauth/token",
  userinfo_endpoint: "https://id.itc.example/oauth/userinfo",
  introspection_endpoint: "https://id.itc.example/oauth/introspect",
  revocation_endpoint: "https://id.itc.example/oauth/revoke",
  jwks_uri: "https://id.itc.example/oauth/jwks",
  scopes_supported: ["openid", "profile"],
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
};

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => handler(url.toString(), init)) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

test("buildAuthorizeUrl: always includes openid, PKCE S256, and everything passed in", () => {
  const url = new URL(buildAuthorizeUrl(DISCOVERY, {
    clientId: "my-app", redirectUri: "https://my-app.example/cb", scope: "profile",
    state: "s-1", nonce: "n-1", codeChallenge: "c-1",
  }));
  assert.equal(url.origin + url.pathname, "https://id.itc.example/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "my-app");
  assert.equal(url.searchParams.get("scope"), "openid profile");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "s-1");
});

test("buildAuthorizeUrl: doesn't double up openid if the caller already asked for it", () => {
  const url = new URL(buildAuthorizeUrl(DISCOVERY, { clientId: "my-app", redirectUri: "https://x", scope: "openid profile", codeChallenge: "c-1" }));
  assert.equal(url.searchParams.get("scope"), "openid profile");
});

test("exchangeCode: posts the grant to the token endpoint and returns the parsed tokens", async () => {
  let seenBody: Record<string, unknown> | undefined;
  const restore = stubFetch((url, init) => {
    seenBody = JSON.parse(String(init?.body));
    assert.equal(url, DISCOVERY.token_endpoint);
    return new Response(JSON.stringify({ access_token: "a", token_type: "Bearer", expires_in: 3600, scope: "openid" }), { status: 200 });
  });
  try {
    const tokens = await exchangeCode(DISCOVERY, { clientId: "my-app" }, { code: "c", redirectUri: "https://x", codeVerifier: "v" });
    assert.equal(tokens.access_token, "a");
    assert.equal(seenBody?.grant_type, "authorization_code");
    assert.equal(seenBody?.client_id, "my-app");
    assert.equal(seenBody?.client_secret, undefined, "no secret for a public client");
  } finally {
    restore();
  }
});

test("exchangeCode: a confidential client sends its secret", async () => {
  let seenBody: Record<string, unknown> | undefined;
  const restore = stubFetch((_url, init) => {
    seenBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ access_token: "a", token_type: "Bearer", expires_in: 3600, scope: "openid" }), { status: 200 });
  });
  try {
    await exchangeCode(DISCOVERY, { clientId: "my-app", clientSecret: "shh" }, { code: "c", redirectUri: "https://x", codeVerifier: "v" });
    assert.equal(seenBody?.client_secret, "shh");
  } finally {
    restore();
  }
});

test("a non-2xx response surfaces as OAuthHttpError with the oauth error code, not a generic HTTP error", async () => {
  const restore = stubFetch(() => new Response(JSON.stringify({ error: "invalid_grant", error_description: "That code is not valid or has expired." }), { status: 400 }));
  try {
    await assert.rejects(
      () => exchangeCode(DISCOVERY, { clientId: "my-app" }, { code: "bad", redirectUri: "https://x", codeVerifier: "v" }),
      (e: OAuthHttpError) => e instanceof OAuthHttpError && e.code === "invalid_grant" && e.status === 400,
    );
  } finally {
    restore();
  }
});
