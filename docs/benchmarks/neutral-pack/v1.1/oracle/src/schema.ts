// A small JSON Schema validator for the subset adapter.schema.json and ui-names.schema.json use:
// type, const, enum, pattern, minLength, minimum, maximum, properties, required,
// additionalProperties, minProperties, items, minItems and local "#/$defs/..." references.

type Schema = Record<string, unknown>;

function typeOf(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
	return typeof value;
}

export function validate(schema: Schema, value: unknown): string[] {
	const root = schema;
	const errors: string[] = [];

	function resolve(s: Schema): Schema {
		const ref = s.$ref;
		if (typeof ref !== "string") return s;
		const match = /^#\/\$defs\/(.+)$/.exec(ref);
		const defs = root.$defs as Record<string, Schema> | undefined;
		const target = match && defs ? defs[match[1]] : undefined;
		if (!target) throw new Error(`unresolvable $ref ${ref}`);
		return resolve(target);
	}

	function walk(raw: Schema, v: unknown, at: string): void {
		const s = resolve(raw);
		const actual = typeOf(v);
		if ("const" in s && JSON.stringify(s.const) !== JSON.stringify(v)) {
			errors.push(`${at}: must equal ${JSON.stringify(s.const)}`);
			return;
		}
		if (Array.isArray(s.enum) && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) {
			errors.push(`${at}: must be one of ${JSON.stringify(s.enum)}`);
			return;
		}
		if (typeof s.type === "string") {
			const ok = s.type === actual || (s.type === "number" && actual === "integer");
			if (!ok) {
				errors.push(`${at}: expected ${s.type}, got ${actual}`);
				return;
			}
		}
		if (actual === "string") {
			const text = v as string;
			if (typeof s.minLength === "number" && text.length < s.minLength) {
				errors.push(`${at}: shorter than ${s.minLength}`);
			}
			if (typeof s.pattern === "string" && !new RegExp(s.pattern, "u").test(text)) {
				errors.push(`${at}: does not match ${s.pattern}`);
			}
		}
		if (actual === "integer" || actual === "number") {
			const n = v as number;
			if (typeof s.minimum === "number" && n < s.minimum) errors.push(`${at}: below ${s.minimum}`);
			if (typeof s.maximum === "number" && n > s.maximum) errors.push(`${at}: above ${s.maximum}`);
		}
		if (actual === "array") {
			const list = v as unknown[];
			if (typeof s.minItems === "number" && list.length < s.minItems) {
				errors.push(`${at}: fewer than ${s.minItems} items`);
			}
			if (s.items && typeof s.items === "object") {
				list.forEach((item, i) => {
					walk(s.items as Schema, item, `${at}[${i}]`);
				});
			}
		}
		if (actual === "object") {
			const obj = v as Record<string, unknown>;
			const props = (s.properties ?? {}) as Record<string, Schema>;
			for (const key of (s.required as string[] | undefined) ?? []) {
				if (!(key in obj)) errors.push(`${at}: missing required ${key}`);
			}
			if (typeof s.minProperties === "number" && Object.keys(obj).length < s.minProperties) {
				errors.push(`${at}: fewer than ${s.minProperties} properties`);
			}
			for (const [key, child] of Object.entries(obj)) {
				if (key in props) {
					walk(props[key], child, `${at}.${key}`);
				} else if (s.additionalProperties === false) {
					errors.push(`${at}: unknown key ${key}`);
				} else if (s.additionalProperties && typeof s.additionalProperties === "object") {
					walk(s.additionalProperties as Schema, child, `${at}.${key}`);
				}
			}
		}
	}

	walk(schema, value, "$");
	return errors;
}
