// Passkeys. The one place this service reaches for a dependency instead of hand-rolling: PKCE,
// JWT signing and TOTP are each a dozen lines over well-known primitives, but correctly verifying
// a WebAuthn attestation or assertion means parsing CBOR, COSE keys and authenticator data and
// checking several signature schemes against them — exactly the kind of thing that is easy to get
// subtly wrong and catastrophic to get wrong, so it comes from @simplewebauthn/server (MIT,
// widely used, the de facto reference implementation) rather than from scratch.
import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON, type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse, type VerifiedRegistrationResponse, type WebAuthnCredential,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import type { Config } from "../config.js";
import type { WebauthnCredential } from "../store/types.js";

/**
 * A WebAuthn ceremony is scoped to the origin the browser is actually on — accounts/web, never
 * this api. `rpID` is that origin's bare hostname; `origin` is the full scheme+host+port a
 * passkey is good for.
 */
export function rpConfig(config: Config): { rpID: string; rpName: string; origin: string } {
  const url = new URL(config.web.url);
  return { rpID: url.hostname, rpName: "ITC Account", origin: url.origin };
}

/** Maps this service's stored row to what @simplewebauthn/server's verifiers expect. */
export function toLibCredential(c: WebauthnCredential): WebAuthnCredential {
  return { id: c.credentialId, publicKey: isoBase64URL.toBuffer(c.publicKey), counter: c.counter, transports: c.transports };
}

export function buildRegistrationOptions(
  config: Config,
  account: { id: string; userName: string; displayName?: string },
  existing: WebauthnCredential[],
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpID, rpName } = rpConfig(config);
  return generateRegistrationOptions({
    rpName,
    rpID,
    userID: isoUint8Array.fromUTF8String(account.id),
    userName: account.userName,
    userDisplayName: account.displayName || account.userName,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.credentialId, transports: c.transports })),
    // "preferred" over "required": a security key with no resident-key support still has to work.
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
}

export function verifyRegistration(config: Config, response: RegistrationResponseJSON, expectedChallenge: string): Promise<VerifiedRegistrationResponse> {
  const { rpID, origin } = rpConfig(config);
  return verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID });
}

/** No `allowCredentials`: the browser offers whichever discoverable passkey it has for this site. */
export function buildAuthenticationOptions(config: Config): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = rpConfig(config);
  return generateAuthenticationOptions({ rpID, userVerification: "preferred" });
}

export function verifyAuthentication(
  config: Config,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: WebAuthnCredential,
): Promise<VerifiedAuthenticationResponse> {
  const { rpID, origin } = rpConfig(config);
  return verifyAuthenticationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, credential });
}
