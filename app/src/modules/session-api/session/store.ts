// The Sessions database calls (infra/postgres/sessions/modules/session-api-sign-in-flow.sql): each
// is one statement calling one product SQL function, so each is one transaction.
import type { DatabaseReadWriter } from "../../dependencies.ts";

const SCHEMA = "m_session_api_sign_in_flow";

export type LoginAttempt = {
	binding_sha256: Buffer;
	nonce_sha256: Buffer;
	verifier_sealed: Buffer;
	return_to: string;
	live: boolean;
};
export type SessionRow =
	| {
			status: "active";
			subject_key: Buffer;
			tokens_sealed: Buffer;
			token_generation: number;
			access_expires_at: Date;
	  }
	| { status: "expired" | "revoked" | "unknown" };

export const sessionStore = (db: DatabaseReadWriter) => ({
	async beginLogin(input: {
		state: Buffer;
		binding: Buffer;
		nonce: Buffer;
		verifier: Buffer;
		returnTo: string;
	}) {
		await db.query(`SELECT ${SCHEMA}.begin_login($1, $2, $3, $4, $5)`, [
			input.state,
			input.binding,
			input.nonce,
			input.verifier,
			input.returnTo,
		]);
	},
	async takeLogin(state: Buffer): Promise<LoginAttempt | undefined> {
		const [row] = await db.query<LoginAttempt>(`SELECT * FROM ${SCHEMA}.take_login($1)`, [state]);
		return row;
	},
	async createSession(input: {
		id: Buffer;
		subjectKey: Buffer;
		tokens: Buffer;
		accessExpiresAt: Date;
		absoluteSeconds: number;
		previous: Buffer | null;
	}) {
		await db.query(`SELECT ${SCHEMA}.create_session($1, $2, $3, $4, $5, $6)`, [
			input.id,
			input.subjectKey,
			input.tokens,
			input.accessExpiresAt,
			input.absoluteSeconds,
			input.previous,
		]);
	},
	async useSession(id: Buffer, idleSeconds: number): Promise<SessionRow> {
		const [row] = await db.query<SessionRow>(`SELECT * FROM ${SCHEMA}.use_session($1, $2)`, [
			id,
			idleSeconds,
		]);
		return row ?? { status: "unknown" };
	},
	async storeTokens(id: Buffer, generation: number, tokens: Buffer, accessExpiresAt: Date) {
		const [row] = await db.query<{ stored: boolean }>(
			`SELECT ${SCHEMA}.store_tokens($1, $2, $3, $4) AS stored`,
			[id, generation, tokens, accessExpiresAt],
		);
		return row?.stored === true;
	},
	async revokeSession(id: Buffer): Promise<Buffer | undefined> {
		const [row] = await db.query<{ tokens_sealed: Buffer }>(
			`SELECT * FROM ${SCHEMA}.revoke_session($1)`,
			[id],
		);
		return row?.tokens_sealed;
	},
	async revokeAccount(subjectKey: Buffer) {
		return db.query<{ id_sha256: Buffer; tokens_sealed: Buffer }>(
			`SELECT * FROM ${SCHEMA}.revoke_account($1)`,
			[subjectKey],
		);
	},
});
export type SessionStore = ReturnType<typeof sessionStore>;
