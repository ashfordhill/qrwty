// Shared types of the neutral oracle. Row modules depend only on these and on RowContext.

export type Status = "passed" | "failed" | "blocked" | "not run";

/** One assertion inside a row. A row's status is derived from its checks. */
export interface CheckRecord {
	name: string;
	status: Status;
	expected: string;
	observed: unknown;
}

export interface Artifact {
	path: string;
	sha256: string;
}

/** One line of results.jsonl (oracle-tooling-plan.md, "Results"). */
export interface ResultLine {
	runId: string;
	arm: string;
	commit: string;
	images: Record<string, string>;
	environment: Record<string, unknown>;
	acceptanceId: string;
	status: Status;
	startedAt: string;
	endedAt: string;
	command: string;
	expected: string;
	observed: {
		checks: CheckRecord[];
		clockOffsets: ClockOffsetRecord[];
		params: Record<string, number>;
		[key: string]: unknown;
	};
	artifacts: Artifact[];
	notes: string;
}

export interface ClockOffsetRecord {
	at: string;
	offsetMs: number;
	boundMs: number | null;
}

/** Adapter capabilities a row may need; a missing one makes the row `blocked`. */
export type Capability =
	| "publicEntry"
	| "edge"
	| "services"
	| "workers"
	| "pubsub"
	| "toxiproxy"
	| "identity"
	| "stripe"
	| "webRisk"
	| "browser"
	| "uiNames"
	| `command:${CommandName}`
	| "productionProfileCheck"
	| "deploymentPreparation";

export const COMMAND_NAMES = [
	"start",
	"stop",
	"kill",
	"terminate",
	"restart",
	"scale",
	"reset",
	"clock",
	"faultPoint",
	"backup",
	"restore",
	"inspect",
	"rotateIdentityKey",
	"rogueKey",
	"issueToken",
	"replayQuarantine",
	"subscriptionCheck",
	"ordinaryBuildAndTest",
] as const;
export type CommandName = (typeof COMMAND_NAMES)[number];

export interface CommandSpec {
	argv: string[];
	cwd?: string;
	timeoutMs?: number;
}

export interface ReplicaSpec {
	name: string;
	url: string;
	container?: string;
}

export interface ServiceSpec {
	roles: string[];
	replicas: ReplicaSpec[];
	health: string;
	readiness: string;
	guardedRoutes?: { method: string; path: string }[];
}

export interface WorkerSpec {
	name: string;
	kind: string;
	container?: string;
}

/** Parsed oracle-adapter.json (see adapter.schema.json). */
export interface Adapter {
	schemaVersion: 1;
	arm: string;
	commit: string;
	images: Record<string, string>;
	publicEntry: { url: string; origin: string };
	edgeTokenEnv: string;
	services: Record<string, ServiceSpec>;
	workers: WorkerSpec[];
	commands: Partial<Record<CommandName, CommandSpec>>;
	toxiproxy?: { apiUrl: string; proxies: Record<string, string[]> };
	pubsub?: { emulatorHost: string; project: string; topic: string };
	identity?: {
		issuerUrl: string;
		audience: string;
		accounts: { alice: string; bob: string; operator: string };
		passwordEnv: string;
	};
	providers?: {
		stripe?: {
			listen: string;
			webhookUrl: string;
			webhookSecretEnv: string;
			priceId: string;
		};
		webRisk?: { listen: string; deadlineMs: number };
	};
	productionProfileCheck?: {
		command: CommandSpec;
		processes: string[];
		settings: { category: string; name: string }[];
	};
	deploymentPreparation?: {
		iacValidate?: CommandSpec;
		secretInventory?: string;
		limitations?: string;
		activationBacklog?: string;
		freshCheckout?: Record<string, CommandSpec>;
		imageDigestsByConfiguration?: string;
	};
	ui?: {
		skins: string[];
		selectSkin: { kind: "query" | "storage"; key: string };
		namesFile?: string;
		humanScans?: string;
	};
	versions?: { previous?: string };
}
