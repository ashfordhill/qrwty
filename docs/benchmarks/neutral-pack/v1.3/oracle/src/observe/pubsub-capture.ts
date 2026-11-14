// Pub/Sub capture against the emulator: the oracle's own subscription on the arm's topic,
// created before traffic, plus publishing of duplicates, out-of-order and poison messages.
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { type Message, PubSub, type Subscription, type Topic } from "@google-cloud/pubsub";

export interface CapturedMessage {
	messageId: string;
	publishTimeIso: string;
	publishTimeMs: number;
	attributes: Record<string, string>;
	data: Buffer;
	json: Record<string, unknown> | null;
	receivedMono: number;
	deliveryAttempt: number;
}

export interface PubSubBinding {
	emulatorHost: string;
	project: string;
	topic: string;
}

export function pubsubClient(binding: PubSubBinding): PubSub {
	return new PubSub({
		projectId: binding.project,
		apiEndpoint: binding.emulatorHost,
		emulatorMode: true,
	});
}

export class PubSubCapture {
	readonly messages: CapturedMessage[] = [];
	readonly client: PubSub;
	readonly topic: Topic;
	subscriptionName: string;
	private subscription: Subscription | null = null;

	readonly binding: PubSubBinding;

	constructor(binding: PubSubBinding, name = `oracle-capture-${randomUUID()}`) {
		this.binding = binding;
		this.client = pubsubClient(binding);
		this.topic = this.client.topic(binding.topic, {
			batching: { maxMessages: 1, maxMilliseconds: 0 },
		});
		this.subscriptionName = name;
	}

	/** Creates the capture subscription (must happen before traffic) and starts streaming pull. */
	async start(): Promise<this> {
		const [subscription] = await this.topic.createSubscription(this.subscriptionName, {
			ackDeadlineSeconds: 60,
		});
		this.subscription = subscription;
		subscription.on("message", (message: Message) => {
			let json: Record<string, unknown> | null = null;
			try {
				const parsed = JSON.parse(message.data.toString("utf8"));
				json = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
			} catch {
				json = null;
			}
			this.messages.push({
				messageId: message.id,
				publishTimeIso: message.publishTime.toISOString(),
				publishTimeMs: message.publishTime.getTime(),
				attributes: { ...message.attributes },
				data: Buffer.from(message.data),
				json,
				receivedMono: performance.now(),
				deliveryAttempt: message.deliveryAttempt ?? 0,
			});
			message.ack();
		});
		subscription.on("error", () => {
			// Streaming errors are retried by the client; a broken capture shows up as missing messages.
		});
		return this;
	}

	/** Unique events by eventId (Pub/Sub may redeliver; the arm may retry with the same ID). */
	events(): Map<string, CapturedMessage> {
		const out = new Map<string, CapturedMessage>();
		for (const m of this.messages) {
			const eventId = typeof m.json?.eventId === "string" ? m.json.eventId : null;
			if (eventId && !out.has(eventId)) out.set(eventId, m);
		}
		return out;
	}

	/** Waits until `predicate` holds or `timeoutMs` passes. */
	async waitFor(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
		const end = performance.now() + timeoutMs;
		while (performance.now() < end) {
			if (predicate()) return true;
			await new Promise((r) => setTimeout(r, 100));
		}
		return predicate();
	}

	async publish(
		data: Buffer,
		attributes: Record<string, string> = { schemaVersion: "1" },
	): Promise<string> {
		return this.topic.publishMessage({ data, attributes });
	}

	/** Republishes captured messages unchanged (duplicates of the same event IDs). */
	async republish(messages: CapturedMessage[]): Promise<string[]> {
		const ids: string[] = [];
		for (const m of messages) ids.push(await this.publish(m.data, m.attributes));
		return ids;
	}

	/** Publishes a copy of `message` with its eventTime moved back by `ageMs` and a new eventId. */
	async publishOlder(
		message: CapturedMessage,
		ageMs: number,
		newId = true,
	): Promise<{ eventId: string; messageId: string }> {
		const body = { ...(message.json ?? {}) };
		const original = Date.parse(String(body.eventTime ?? new Date().toISOString()));
		body.eventTime = new Date(original - ageMs).toISOString();
		if (newId) body.eventId = randomUUID();
		const messageId = await this.publish(
			Buffer.from(JSON.stringify(body), "utf8"),
			message.attributes,
		);
		return { eventId: String(body.eventId), messageId };
	}

	async stop(): Promise<void> {
		if (this.subscription) {
			this.subscription.removeAllListeners("message");
			await this.subscription.close();
			await this.subscription.delete().catch(() => undefined);
			this.subscription = null;
		}
		await this.client.close();
	}
}
