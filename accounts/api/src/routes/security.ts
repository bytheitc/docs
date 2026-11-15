// Account security, for someone already signed in: passkeys, a password, TOTP two-factor and
// recovery codes. All additive — enrolling any of these never changes how the account was
// created (portal's federated login, untouched) and never requires it to be re-done.
//
//   GET    /account/credentials                what's enrolled
//   POST   /account/webauthn/register/options   → { options }
//   POST   /account/webauthn/register/verify    { response, name? } → { credential }
//   DELETE /account/webauthn/:credentialId
//   POST   /account/password                    { password } → { ok: true }
//   DELETE /account/password
//   POST   /account/totp/enroll                  → { secret, otpauthUrl }
//   POST   /account/totp/confirm                 { code } → { recoveryCodes }
//   DELETE /account/totp
//   POST   /account/recovery-codes               → { recoveryCodes }  (regenerate)
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { Router } from "express";
import { badRequest, body, str, HttpError } from "../http.js";
import { needsAccount, needsDatabase } from "../guard.js";
import { resolveProfile } from "../profile.js";
import { rateLimit } from "../ratelimit.js";
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../security/password.js";
import { generateRecoveryCodes, normalizeRecoveryCode } from "../security/recoveryCodes.js";
import { sha256 } from "../oauth/crypto.js";
import { generateTotpSecret, totpUrl, verifyTotp } from "../security/totp.js";
import { buildRegistrationOptions, verifyRegistration } from "../security/webauthn.js";
import { requireAccountsStore } from "../store/index.js";
import type { Ctx } from "../app.js";

const REGISTER_TTL_MS = 300_000;
const RECOVERY_CODE_COUNT = 10;
const limited = async (ip: string, name: string, max: number) => !(await rateLimit(`security:${name}:${ip}`, max));

export function securityRoutes(ctx: Ctx): Router {
  const r = Router();
  // Scoped to /account: an unscoped r.use() here would gate every route mounted after this
  // router in app.ts too, since Express sends a request down the error path (skipping the rest
  // of the chain, oauthRoutes included) the moment this middleware calls next(err) — exactly
  // what broke /oauth/token and /oauth/userinfo, which carry a client credential or an access
  // token, never an account session bearer.
  r.use("/account", needsDatabase, needsAccount(ctx));

  r.get("/account/credentials", async (req, res) => {
    const accountId = req.account!.id;
    const store = requireAccountsStore();
    const [passkeys, password, totp, recovery] = await Promise.all([
      store.listWebauthnCredentials(accountId),
      store.getPasswordCredential(accountId),
      store.getTotpCredential(accountId),
      store.countUnusedRecoveryCodes(accountId),
    ]);
    res.json({
      passkeys: passkeys.map((p) => ({ credentialId: p.credentialId, name: p.name, createdAt: p.createdAt, lastUsedAt: p.lastUsedAt })),
      password: Boolean(password),
      totp: Boolean(totp?.confirmedAt),
      recoveryCodesRemaining: recovery,
    });
  });

  /* ---------------- passkeys ---------------- */

  r.post("/account/webauthn/register/options", async (req, res) => {
    const accountId = req.account!.id;
    const profile = await resolveProfile(ctx, accountId);
    if (!profile) throw new HttpError(403, "forbidden", "That account is not available.");

    const store = requireAccountsStore();
    const existing = await store.listWebauthnCredentials(accountId);
    const options = await buildRegistrationOptions(
      ctx.config,
      { id: accountId, userName: profile.handle ?? accountId, displayName: profile.displayName },
      existing,
    );

    const now = new Date();
    await store.createWebauthnChallenge({ key: accountId, challenge: options.challenge, accountId, expiresAt: new Date(now.getTime() + REGISTER_TTL_MS), createdAt: now });
    res.json({ options });
  });

  r.post("/account/webauthn/register/verify", async (req, res) => {
    const accountId = req.account!.id;
    const b = body(req);
    const response = b.response;
    if (!response || typeof response !== "object") throw badRequest("A WebAuthn response is required.");
    const name = str(b, "name", { max: 60 }) || "Passkey";

    const store = requireAccountsStore();
    const pending = await store.consumeWebauthnChallenge(accountId, new Date());
    if (!pending) throw badRequest("That registration attempt expired. Please try again.");

    let verified;
    try {
      verified = await verifyRegistration(ctx.config, response as Parameters<typeof verifyRegistration>[1], pending.challenge);
    } catch (e) {
      throw badRequest(`That passkey couldn't be registered: ${(e as Error).message}`);
    }
    if (!verified.verified) throw badRequest("That passkey couldn't be registered.");

    const { credential, credentialBackedUp, credentialDeviceType } = verified.registrationInfo;
    const row = {
      credentialId: credential.id,
      accountId,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
      deviceType: credentialDeviceType === "multiDevice" ? ("multiDevice" as const) : ("singleDevice" as const),
      backedUp: credentialBackedUp,
      name,
      createdAt: new Date(),
    };
    await store.addWebauthnCredential(row);
    res.json({ credential: { credentialId: row.credentialId, name: row.name, createdAt: row.createdAt } });
  });

  r.delete("/account/webauthn/:credentialId", async (req, res) => {
    await requireAccountsStore().deleteWebauthnCredential(req.account!.id, String(req.params.credentialId ?? ""));
    res.json({ ok: true });
  });

  /* ---------------- password ---------------- */

  r.post("/account/password", async (req, res) => {
    const password = str(body(req), "password", { required: true, max: MAX_PASSWORD_LENGTH });
    if (password.length < MIN_PASSWORD_LENGTH) throw badRequest(`A password must be at least ${MIN_PASSWORD_LENGTH} characters.`, { password: "Too short." });

    const accountId = req.account!.id;
    const { hash, salt } = await hashPassword(password);
    const now = new Date();
    await requireAccountsStore().setPasswordCredential({ accountId, hash, salt, createdAt: now, updatedAt: now });
    res.json({ ok: true });
  });

  r.delete("/account/password", async (req, res) => {
    await requireAccountsStore().deletePasswordCredential(req.account!.id);
    res.json({ ok: true });
  });

  /* ---------------- TOTP ---------------- */

  r.post("/account/totp/enroll", async (req, res) => {
    if (await limited(req.ip ?? "local", "totp-enroll", 10)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const accountId = req.account!.id;
    const profile = await resolveProfile(ctx, accountId);
    const secret = generateTotpSecret();
    await requireAccountsStore().setTotpCredential({ accountId, secret, createdAt: new Date() });
    res.json({ secret, otpauthUrl: totpUrl(secret, profile?.handle ?? accountId, "ITC Account") });
  });

  r.post("/account/totp/confirm", async (req, res) => {
    if (await limited(req.ip ?? "local", "totp-confirm", 10)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const accountId = req.account!.id;
    const code = str(body(req), "code", { required: true, max: 10 });

    const store = requireAccountsStore();
    const totp = await store.getTotpCredential(accountId);
    if (!totp || !verifyTotp(totp.secret, code)) throw badRequest("That code wasn't right.", { code: "Incorrect." });

    await store.confirmTotpCredential(accountId, new Date());
    const codes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
    const now = new Date();
    await store.replaceRecoveryCodes(accountId, codes.map((c) => ({ accountId, codeHash: sha256(normalizeRecoveryCode(c)), createdAt: now })));
    res.json({ recoveryCodes: codes });
  });

  r.delete("/account/totp", async (req, res) => {
    await requireAccountsStore().deleteTotpCredential(req.account!.id);
    res.json({ ok: true });
  });

  /* ---------------- recovery codes ---------------- */

  r.post("/account/recovery-codes", async (req, res) => {
    if (await limited(req.ip ?? "local", "recovery-regen", 5)) throw new HttpError(429, "rate_limited", "Too many attempts. Try again shortly.");
    const accountId = req.account!.id;
    const codes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
    const now = new Date();
    await requireAccountsStore().replaceRecoveryCodes(accountId, codes.map((c) => ({ accountId, codeHash: sha256(normalizeRecoveryCode(c)), createdAt: now })));
    res.json({ recoveryCodes: codes });
  });

  return r;
}
