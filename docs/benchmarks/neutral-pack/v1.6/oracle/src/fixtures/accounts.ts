// The oracle's three test accounts (acceptance-oracle.md §2, Identity). Rows name an account by
// its key; the adapter's identity section maps each key to the login identifier the arm's issuer
// knows (pack v1.6). Without an `accounts` map, the local issuer's names below are used.
import type { Adapter } from "../types.ts";

export const ACCOUNT_KEYS = ["alice", "bob", "operator"] as const;

export type AccountKey = (typeof ACCOUNT_KEYS)[number];

/** Login identifiers when the adapter's identity section has no `accounts` map (local issuers). */
export const DEFAULT_LOGINS: Readonly<Record<AccountKey, string>> = {
	alice: "oracle-alice",
	bob: "oracle-bob",
	operator: "oracle-operator",
};

/**
 * The login identifier of an account: the adapter's mapping, or the default name when the
 * identity section has no `accounts` map. Null when `accounts` is given and leaves this key out.
 */
export function loginFor(identity: Adapter["identity"], account: AccountKey): string | null {
	if (!identity?.accounts) return DEFAULT_LOGINS[account];
	return identity.accounts[account] ?? null;
}
