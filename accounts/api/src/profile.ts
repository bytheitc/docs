// Merges this service's own account row with a live read of the portal contributor it was created
// from. Shared by the oauth routes (an id_token or userinfo call) and the account routes (so
// accounts/web can greet the person signed in and render the consent screen).
import type { Ctx } from "./app.js";
import { PortalClient } from "./portal-client.js";
import type { AccountProfile } from "./oauth/types.js";
import { requireAccountsStore } from "./store/index.js";

/**
 * A portal contributor that is gone or disabled, or an account row that no longer exists, both
 * come back `disabled: true` — every caller treats that the same as "cannot sign in."
 */
export async function resolveProfile(ctx: Ctx, accountId: string): Promise<AccountProfile | null> {
  const account = await requireAccountsStore().getAccount(accountId);
  if (!account) return null;
  const portal = new PortalClient(ctx.config);
  const contributor = await portal.contributor(account.portalContributorId);
  if (!contributor) return { id: accountId, disabled: true };
  return {
    id: accountId,
    disabled: Boolean(contributor.disabled),
    handle: contributor.handle,
    displayName: contributor.displayName,
    avatarUrl: contributor.avatarUrl,
    tier: contributor.tier,
    entitlements: contributor.entitlements,
    contributions: contributor.contributions,
    houses: contributor.houses,
  };
}
