// QRWTY arm A's tests. `unit`: offline, no Docker, no network (pnpm test). `integration`: a
// disposable real PostgreSQL 17 from infra/local/test-postgres.sh (pnpm test:integration).
// `stack`: the running two-copy local stack (pnpm test:stack; see docs/evidence/q06).
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{ test: { name: "unit", include: ["test/unit/**/*.test.ts"] } },
			{
				test: {
					name: "integration",
					include: ["test/integration/**/*.test.ts"],
					fileParallelism: false,
					testTimeout: 120_000,
					hookTimeout: 120_000,
				},
			},
			{
				test: {
					name: "stack",
					include: ["test/stack/**/*.test.ts"],
					fileParallelism: false,
					testTimeout: 600_000,
					hookTimeout: 600_000,
				},
			},
		],
	},
});
