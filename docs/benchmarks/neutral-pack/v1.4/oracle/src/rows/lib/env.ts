// Environments for R rows: no cloud credentials, and optionally no network.

import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CREDENTIAL_VARS =
	/^(GOOGLE_|GCLOUD_|CLOUDSDK_|GCP_|STRIPE_|CLOUDFLARE_|AWS_|AZURE_|GH_|GITHUB_TOKEN)|_(TOKEN|SECRET|KEY|PASSWORD)$/;

/** The current environment without cloud credentials, with an empty HOME (no gcloud ADC). */
export function credentialFreeEnv(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (!CREDENTIAL_VARS.test(key)) env[key] = value;
	}
	const home = mkdtempSync(join(tmpdir(), "oracle-home-"));
	env.HOME = home;
	env.XDG_CONFIG_HOME = join(home, ".config");
	return env;
}

/** True when `unshare -rn` can run a command without network access on this host. */
export function canIsolateNetwork(): boolean {
	const probe = spawnSync("unshare", ["-rn", "true"], { stdio: "ignore" });
	return probe.status === 0;
}
