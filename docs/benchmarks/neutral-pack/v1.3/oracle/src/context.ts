// RowContext: everything a row module may use. Rows talk to the arm only through these tools,
// which in turn use only the adapter manifest and the external contract.
import { performance } from "node:perf_hooks";
import { envValue, type LoadedAdapter, proxiesFor } from "./adapter.ts";
import type { BrowserDriver, UiNames } from "./browser/driver.ts";
import type { EdgeIdentity } from "./client/client.ts";
import { Api } from "./client/session.ts";
import { Clock } from "./faults/clock.ts";
import { Commands } from "./faults/commands.ts";
import { Toxiproxy } from "./faults/toxiproxy.ts";
import { ACCOUNTS, type AccountKey } from "./fixtures/accounts.ts";
import type { StripeFixture } from "./fixtures/stripe.ts";
import type { WebRiskFixture } from "./fixtures/webrisk.ts";
import { CaptureProxy } from "./observe/capture-proxy.ts";
import { PubSubCapture } from "./observe/pubsub-capture.ts";
import type { RunWriter } from "./observe/results.ts";
import type { Adapter, Artifact, CheckRecord, Status } from "./types.ts";

export interface RunResources {
	loaded: LoadedAdapter;
	writer: RunWriter;
	scope: string;
	stripe: StripeFixture | null;
	webRisk: WebRiskFixture | null;
	browser: () => Promise<BrowserDriver>;
	uiNames: UiNames | null;
}

export class RowContext {
	readonly checks: CheckRecord[] = [];
	readonly notes: string[] = [];
	readonly artifacts: Artifact[] = [];
	readonly adapter: Adapter;
	readonly commands: Commands;
	readonly clock: Clock;
	readonly observed: Record<string, unknown> = {};
	private readonly cleanups: (() => Promise<void>)[] = [];
	private readonly accounts = new Map<AccountKey, Api>();
	private toxi: Toxiproxy | null = null;
	usedFaults = false;

	readonly id: string;
	readonly run: RunResources;
	readonly params: Record<string, number>;

	constructor(id: string, run: RunResources, params: Record<string, number>) {
		this.id = id;
		this.run = run;
		this.params = params;
		this.adapter = run.loaded.adapter;
		this.commands = new Commands(this.adapter.commands, run.loaded.baseDir);
		this.clock = new Clock(this.commands);
	}

	get scope(): string {
		return this.run.scope;
	}

	get origin(): string {
		return this.adapter.publicEntry.origin;
	}

	get edgeToken(): string | undefined {
		return envValue(this.adapter.edgeTokenEnv);
	}

	/** Edge identity for a synthetic client address (and optionally country / synthetic probe). */
	edge(clientIp: string, extra: Omit<EdgeIdentity, "token" | "clientIp"> = {}): EdgeIdentity {
		return { token: this.edgeToken, clientIp, ...extra };
	}

	// ---- checks ----

	check(name: string, ok: boolean, expected: string, observed: unknown): boolean {
		this.checks.push({ name, status: ok ? "passed" : "failed", expected, observed });
		return ok;
	}

	mark(name: string, status: Status, expected: string, observed: unknown): void {
		this.checks.push({ name, status, expected, observed });
	}

	blocked(name: string, reason: string): void {
		this.mark(name, "blocked", "the check can run", reason);
	}

	notRun(name: string, reason: string): void {
		this.mark(name, "not run", "the check runs", reason);
	}

	note(text: string): void {
		this.notes.push(text);
	}

	async artifact(name: string, content: unknown): Promise<Artifact> {
		const artifact = await this.run.writer.artifact(this.id, name, content);
		this.artifacts.push(artifact);
		return artifact;
	}

	onCleanup(fn: () => Promise<void>): void {
		this.cleanups.unshift(fn);
	}

	async cleanup(): Promise<void> {
		for (const fn of this.cleanups) {
			try {
				await fn();
			} catch (error) {
				this.note(`cleanup error: ${(error as Error).message}`);
			}
		}
		try {
			await this.clock.reset();
		} catch (error) {
			this.note(`clock reset failed: ${(error as Error).message}`);
		}
		if (this.toxi && this.usedFaults) {
			try {
				await this.toxi.reset();
			} catch (error) {
				this.note(`toxiproxy reset failed: ${(error as Error).message}`);
			}
		}
	}

	// ---- actors ----

	/**
	 * A fresh browser-like actor (empty cookie jar) at the public entry. Unless an edge identity
	 * is given, each actor gets its own synthetic client address (198.19.0.0/16) through the
	 * trusted edge, so guest admission only limits the rows that test it (A17).
	 */
	api(edge?: EdgeIdentity): Api {
		return Api.forEntry(this.adapter.publicEntry.url, this.origin, edge ?? this.randomEdge());
	}

	randomEdge(): EdgeIdentity {
		if (!this.edgeToken) return {};
		const n = Math.floor(Math.random() * 65_534) + 1;
		return this.edge(`198.19.${n >> 8}.${n & 255 || 1}`);
	}

	/** A fresh actor that talks to one replica directly (internal URL) with Host = origin. */
	replicaApi(url: string, edge: EdgeIdentity = {}): Api {
		return Api.forEntry(url, this.origin, edge);
	}

	password(): string {
		const value = envValue(this.adapter.identity?.passwordEnv);
		if (!value) throw new Error("test password environment variable is unset");
		return value;
	}

	/** A signed-in actor for oracle-alice, oracle-bob or oracle-operator (cached per row). */
	async signedIn(account: AccountKey): Promise<Api> {
		const cached = this.accounts.get(account);
		if (cached) return cached;
		const api = this.api();
		const result = await api.signIn(ACCOUNTS[account], this.password());
		if (!result.ok)
			throw new Error(`sign-in as ${ACCOUNTS[account]} failed: ${result.steps.join(" > ")}`);
		const session = await api.session();
		if (!session.body?.authenticated)
			throw new Error(`session for ${ACCOUNTS[account]} is not authenticated`);
		this.accounts.set(account, api);
		return api;
	}

	// ---- observation and faults ----

	toxiproxy(): Toxiproxy {
		if (!this.adapter.toxiproxy) throw new Error("adapter has no toxiproxy section");
		this.toxi ??= new Toxiproxy(this.adapter.toxiproxy.apiUrl);
		this.usedFaults = true;
		return this.toxi;
	}

	proxies(dependency: string): string[] {
		return proxiesFor(this.adapter, dependency);
	}

	async pubsub(): Promise<PubSubCapture> {
		if (!this.adapter.pubsub) throw new Error("adapter has no pubsub section");
		const capture = await new PubSubCapture(
			this.adapter.pubsub,
			`oracle-${this.id.toLowerCase()}-${Date.now()}`,
		).start();
		this.onCleanup(() => capture.stop());
		return capture;
	}

	async captureProxy(upstream = this.adapter.publicEntry.url): Promise<CaptureProxy> {
		const proxy = await new CaptureProxy(upstream).start();
		this.onCleanup(() => proxy.close());
		return proxy;
	}

	stripe(): StripeFixture {
		if (!this.run.stripe) throw new Error("the Stripe fixture is not running");
		return this.run.stripe;
	}

	webRisk(): WebRiskFixture {
		if (!this.run.webRisk) throw new Error("the Web Risk fixture is not running");
		return this.run.webRisk;
	}

	browser(): Promise<BrowserDriver> {
		return this.run.browser();
	}

	get uiNames(): UiNames | null {
		return this.run.uiNames;
	}

	async inspect<T = Record<string, unknown>>(what: string): Promise<T> {
		return this.commands.run<T>("inspect", { what });
	}

	sleep(ms: number): Promise<void> {
		return new Promise((r) => setTimeout(r, ms));
	}

	mono(): number {
		return performance.now();
	}
}
