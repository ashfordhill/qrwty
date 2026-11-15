// Cloudflare Worker entry for qrwty.io, www.qrwty.io and b.qrwty.io (Custom Domains, see
// wrangler.toml). deploy.sh sets BUILD_COMMIT and BUILT_AT with `wrangler deploy --var`;
// ASSETS is the static-assets binding for public/ (the /versions/ pages).

import { type Assets, handle } from "./router.ts";

interface Env {
	BUILD_COMMIT?: string;
	BUILT_AT?: string;
	ASSETS?: Assets;
}

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handle(
			request,
			{ commit: env.BUILD_COMMIT ?? "unknown", builtAt: env.BUILT_AT ?? "unknown" },
			env.ASSETS,
		);
	},
};
