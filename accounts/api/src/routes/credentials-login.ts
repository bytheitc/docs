// Signing in with a passkey or a password — additional ways into an account that already exists
// (enrolled at /account/*, see routes/security.ts), never a second way to create one.
//
//   POST /login/webauthn/options   {} → { options, flowId }
//   POST /login/webauthn/verify    { flowId, response } → { token, expiresAt }
//   POST /login/password           { handle, password, code? } → { needsTotp: true } | { token, expiresAt }
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { badRequest, body, str, HttpError } from "../http.js";
import { needsDatabase } from "../guard.js";
import { resolveProfile } from "../profile.js";
import { PortalClient } from "../portal-client.js";
import { rateLimit } from "../ratelimit.js";
import { normalizeRecoveryCode } from "../security/recoveryCodes.js";
import { sha256 } from "../oauth/crypto.js";
import { dummyPasswordHash, verifyPassword } from "../security/password.js";
import { totpStepForCode } from "../security/totp.js";
import { buildAuthenticationOptions, toLibCredential, verifyAuthentication } from "../security/webauthn.js";
import { startAccountSession } from "../session.js";
import { requireAccountsStore } from "../store/index.js";
import type { Ctx } from "../app.js";

const CHALLENGE_TTL_MS = 120_000;
const limited = async (ip: string, name: string, max: number) => !(await rateLimit(`login:${name}:${ip}`, max));

export function credentialsLoginRoutes(ctx: Ctx): Router {
  const r = Router();
  const portal = new PortalClient(ctx.config);

  /* ---------------- passkey ---------------- */

  r.post("/login/webauthn/options", needsDatabase, async (req, res) => {
    if (await limited(req.ip ?? "local", "webauthn-options", 60)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const options = await buildAuthenticationOptions(ctx.config);
    const flowId = randomUUID();
    const now = new Date();
    await requireAccountsStore().createWebauthnChallenge({
      key: flowId, challenge: options.challenge, expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS), createdAt: now,
    });
    res.json({ options, flowId });
  });

  r.post("/login/webauthn/verify", needsDatabase, async (req, res) => {
    if (await limited(req.ip ?? "local", "webauthn-verify", 30)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const b = body(req);
    const flowId = str(b, "flowId", { required: true, max: 100 });
    const response = b.response;
    if (!response || typeof response !== "object") throw badRequest("A WebAuthn response is required.");

    const store = requireAccountsStore();
    const pending = await store.consumeWebauthnChallenge(flowId, new Date());
    if (!pending) throw badRequest("That sign-in attempt expired. Please try again.");

    const credentialId = (response as { id?: string }).id;
    const stored = credentialId ? await store.getWebauthnCredential(credentialId) : null;
    if (!stored) return void res.status(401).json({ error: { code: "unauthorized", message: "That passkey isn't registered here." } });

    let verified: { verified: boolean; authenticationInfo: { newCounter: number } };
    try {
      verified = await verifyAuthentication(
        ctx.config,
        response as Parameters<typeof verifyAuthentication>[1],
        pending.challenge,
        toLibCredential(stored),
      );
    } catch {
      return void res.status(401).json({ error: { code: "unauthorized", message: "That passkey could not be verified." } });
    }
    if (!verified.verified) return void res.status(401).json({ error: { code: "unauthorized", message: "That passkey could not be verified." } });

    await store.updateWebauthnCredentialCounter(stored.credentialId, verified.authenticationInfo.newCounter, new Date());

    const profile = await resolveProfile(ctx, stored.accountId);
    if (!profile || profile.disabled) return void res.status(403).json({ error: { code: "forbidden", message: "That account is not available." } });

    const session = await startAccountSession(stored.accountId);
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString() });
  });

  /* ---------------- password (+ optional TOTP / recovery code) ---------------- */

  r.post("/login/password", needsDatabase, async (req, res) => {
    if (await limited(req.ip ?? "local", "password", 10)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again in a minute.");
    const b = body(req);
    const handle = str(b, "handle", { required: true, max: 40 }).toLowerCase();
    const password = str(b, "password", { required: true, max: 200 });
    const code = str(b, "code", { max: 40 });

    const invalid = () => res.status(401).json({ error: { code: "unauthorized", message: "That handle and password didn't match." } });

    const store = requireAccountsStore();
    const contributor = await portal.contributorByHandle(handle);
    const account = contributor && !contributor.disabled ? await store.getAccountByPortalContributorId(contributor.id) : null;
    const credential = account ? await store.getPasswordCredential(account.id) : null;

    // verifyPassword (scrypt) runs every time, against a dummy hash when there's no real
    // credential, so a missing handle/account/credential costs the same as a wrong password —
    // otherwise the response time alone tells an attacker which handles have a password set.
    const passwordOk = await verifyPassword(password, credential ?? (await dummyPasswordHash()));
    if (!account || !credential || !passwordOk) return void invalid();

    const totp = await store.getTotpCredential(account.id);
    if (totp?.confirmedAt) {
      if (!code) return void res.json({ needsTotp: true });
      const step = totpStepForCode(totp.secret, code);
      const ok = (step !== null && (await store.consumeTotpStep(account.id, step)))
        || (await store.consumeRecoveryCode(account.id, sha256(normalizeRecoveryCode(code)), new Date()));
      if (!ok) return void res.status(401).json({ error: { code: "unauthorized", message: "That code wasn't right." } });
    }

    const session = await startAccountSession(account.id);
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString() });
  });

  return r;
}
