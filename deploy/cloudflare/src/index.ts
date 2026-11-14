// Cloudflare Worker entry for qrwty.io and www.qrwty.io (Custom Domains, see wrangler.toml).
// deploy.sh sets BUILD_COMMIT and BUILT_AT with `wrangler deploy --var`.

import { route } from "./router.ts";

interface Env {
	BUILD_COMMIT?: string;
	BUILT_AT?: string;
}

export default {
	fetch(request: Request, env: Env): Response {
		return route(request, {
			commit: env.BUILD_COMMIT ?? "unknown",
			builtAt: env.BUILT_AT ?? "unknown",
		});
	},
};
