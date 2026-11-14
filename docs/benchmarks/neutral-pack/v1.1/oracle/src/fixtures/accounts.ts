// Test accounts in the arm's local issuer (acceptance-oracle.md §2, Identity).
export const ACCOUNTS = {
	alice: "oracle-alice",
	bob: "oracle-bob",
	operator: "oracle-operator",
} as const;

export type AccountKey = keyof typeof ACCOUNTS;
