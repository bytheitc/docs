// Matches a provider author to a contributor via linked accounts: provider user id first, then username
// (case-insensitive; used for Wikimedia and Hugging Face, whose public data carries usernames only). Pure.
export interface AccountKey { provider: string; providerUserId: string; username: string; contributorId: string }

export function matcher(accounts: AccountKey[]) {
  const byId = new Map<string, string>(), byName = new Map<string, string>();
  for (const a of accounts) {
    byId.set(`${a.provider}:${a.providerUserId}`, a.contributorId);
    byName.set(`${a.provider}:${a.username.toLowerCase()}`, a.contributorId);
  }
  return (author: { id?: string; username?: string }, provider: string): string | null =>
    (author.id && byId.get(`${provider}:${author.id}`)) || (author.username && byName.get(`${provider}:${author.username.toLowerCase()}`)) || null;
}
