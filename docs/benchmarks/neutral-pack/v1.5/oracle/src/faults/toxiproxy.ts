// Toxiproxy HTTP API driver (server pinned: ghcr.io/shopify/toxiproxy:2.13.0).
// https://github.com/Shopify/toxiproxy#http-api
// Faults: refuse = disable the proxy (new connections refused, open ones closed);
// stall = a `timeout` toxic with timeout 0 (data held, never delivered) or a `latency` toxic;
// break = a `reset_peer` toxic (established connections reset with TCP RST).

export interface ProxyInfo {
	name: string;
	listen: string;
	upstream: string;
	enabled: boolean;
	toxics: { name: string; type: string; stream: string; attributes: Record<string, number> }[];
}

export type FaultKind = "refuse" | "stall" | "latency" | "break";

export class Toxiproxy {
	readonly log: { at: string; action: string; proxies: string[]; detail?: unknown }[] = [];

	readonly apiUrl: string;

	constructor(apiUrl: string) {
		this.apiUrl = apiUrl;
	}

	private async call(method: string, path: string, body?: unknown): Promise<unknown> {
		const response = await fetch(new URL(path, this.apiUrl), {
			method,
			headers: body === undefined ? {} : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const text = await response.text();
		if (!response.ok && !(method === "DELETE" && response.status === 404)) {
			throw new Error(`toxiproxy ${method} ${path}: ${response.status} ${text.slice(0, 200)}`);
		}
		return text ? JSON.parse(text) : null;
	}

	async version(): Promise<string> {
		const response = await fetch(new URL("/version", this.apiUrl));
		const text = (await response.text()).trim();
		try {
			const parsed = JSON.parse(text) as { version?: string };
			return parsed.version ?? text;
		} catch {
			return text;
		}
	}

	async proxies(): Promise<Record<string, ProxyInfo>> {
		return (await this.call("GET", "/proxies")) as Record<string, ProxyInfo>;
	}

	async createProxy(name: string, listen: string, upstream: string): Promise<ProxyInfo> {
		await this.call("DELETE", `/proxies/${encodeURIComponent(name)}`);
		return (await this.call("POST", "/proxies", {
			name,
			listen,
			upstream,
			enabled: true,
		})) as ProxyInfo;
	}

	async deleteProxy(name: string): Promise<void> {
		await this.call("DELETE", `/proxies/${encodeURIComponent(name)}`);
	}

	private async addToxic(proxy: string, toxic: Record<string, unknown>): Promise<void> {
		await this.call("POST", `/proxies/${encodeURIComponent(proxy)}/toxics`, toxic);
	}

	/** Removes every toxic and re-enables the named proxies. */
	async restore(names: string[]): Promise<void> {
		for (const name of names) {
			const info = (await this.call("GET", `/proxies/${encodeURIComponent(name)}`)) as ProxyInfo;
			for (const toxic of info.toxics ?? []) {
				await this.call(
					"DELETE",
					`/proxies/${encodeURIComponent(name)}/toxics/${encodeURIComponent(toxic.name)}`,
				);
			}
			await this.call("POST", `/proxies/${encodeURIComponent(name)}`, { enabled: true });
		}
		this.log.push({ at: new Date().toISOString(), action: "restore", proxies: names });
	}

	async fault(
		kind: FaultKind,
		names: string[],
		options: { latencyMs?: number; resetAfterMs?: number } = {},
	): Promise<void> {
		for (const name of names) {
			if (kind === "refuse") {
				await this.call("POST", `/proxies/${encodeURIComponent(name)}`, { enabled: false });
				continue;
			}
			for (const stream of ["upstream", "downstream"]) {
				const base = { name: `oracle-${kind}-${stream}`, stream, toxicity: 1 };
				if (kind === "stall")
					await this.addToxic(name, { ...base, type: "timeout", attributes: { timeout: 0 } });
				if (kind === "latency") {
					await this.addToxic(name, {
						...base,
						type: "latency",
						attributes: { latency: options.latencyMs ?? 5000, jitter: 0 },
					});
				}
				if (kind === "break") {
					await this.addToxic(name, {
						...base,
						type: "reset_peer",
						attributes: { timeout: options.resetAfterMs ?? 0 },
					});
				}
			}
		}
		this.log.push({ at: new Date().toISOString(), action: kind, proxies: names, detail: options });
	}

	/** Global reset: all proxies enabled, all toxics removed. */
	async reset(): Promise<void> {
		await this.call("POST", "/reset");
		this.log.push({ at: new Date().toISOString(), action: "reset", proxies: ["*"] });
	}
}
