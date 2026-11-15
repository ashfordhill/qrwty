// Cloudflare Worker entry for qrwty.io, www.qrwty.io and b.qrwty.io (Custom Domains, see
// wrangler.toml). deploy.sh sets BUILD_COMMIT and BUILT_AT with `wrangler deploy --var`;
// ASSETS is the static-assets binding for public/ (the /versions/ pages); SESSION_API_ORIGIN
// (wrangler.toml) is arm A's Session API on Cloud Run (A2), and REDIRECT_SERVICE_ORIGIN its
// Redirect service (A4).

import { type Assets, handle } from "./router.ts";

interface Env {
	BUILD_COMMIT?: string;
	BUILT_AT?: string;
	ASSETS?: Assets;
	SESSION_API_ORIGIN?: string;
	REDIRECT_SERVICE_ORIGIN?: string;
}

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handle(
			request,
			{ commit: env.BUILD_COMMIT ?? "unknown", builtAt: env.BUILT_AT ?? "unknown" },
			env.ASSETS,
			env.SESSION_API_ORIGIN
				? { url: env.SESSION_API_ORIGIN, fetch: (upstream) => fetch(upstream) }
				: undefined,
			env.REDIRECT_SERVICE_ORIGIN
				? { url: env.REDIRECT_SERVICE_ORIGIN, fetch: (upstream) => fetch(upstream) }
				: undefined,
		);
	},
};
