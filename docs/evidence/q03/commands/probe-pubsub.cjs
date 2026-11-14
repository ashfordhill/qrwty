// Q03 G12 probe: native Pub/Sub semantics with the pinned SDK against the pinned emulator.
// Usage: PUBSUB_EMULATOR_HOST=127.0.0.1:<port> node probe-pubsub.cjs <phase> (setup|stopped|restarted)
const { createRequire } = require("node:module");
const sdk = createRequire("/home/ash/github/qrwty/docs/benchmarks/neutral-pack/v1.1/oracle/package.json")("@google-cloud/pubsub");
const project = "q03-probe";
const phase = process.argv[2];
const pubsub = new sdk.PubSub({ projectId: project });
const now = () => performance.now();
const race = (promise, ms) => Promise.race([promise.then((value) => ({ settled: "resolved", value }), (error) => ({ settled: "rejected", error: `${error.code ?? ""} ${error.message}`.trim().slice(0, 200) })), new Promise((r) => setTimeout(() => r({ settled: `pending after ${ms} ms` }), ms))]);
async function main() {
  const out = { sdk: require("/home/ash/github/qrwty/docs/benchmarks/neutral-pack/v1.1/oracle/node_modules/@google-cloud/pubsub/package.json").version, phase };
  if (phase === "setup") {
    const [topic] = await pubsub.createTopic("clicks");
    const [sub] = await topic.createSubscription("analytics", { ackDeadlineSeconds: 10 });
    let dlq;
    try {
      const [dead] = await pubsub.createTopic("clicks-dead");
      await topic.createSubscription("analytics-dlq", { ackDeadlineSeconds: 10, deadLetterPolicy: { deadLetterTopic: dead.name, maxDeliveryAttempts: 5 } });
      dlq = "created";
    } catch (error) { dlq = `refused: ${error.message.slice(0, 160)}`; }
    out.deadLetterSubscription = dlq;
    const t0 = now();
    const id1 = await topic.publishMessage({ data: Buffer.from('{"eventId":"e-1"}'), attributes: { schemaVersion: "1", eventId: "e-1" } });
    out.publish = { serverMessageId: id1, ms: Math.round(now() - t0) };
    const id2 = await topic.publishMessage({ data: Buffer.from('{"eventId":"e-1"}'), attributes: { schemaVersion: "1", eventId: "e-1" } });
    out.samePayloadAgain = { serverMessageId: id2, distinctServerIds: id1 !== id2 };
    // Receive: nack the first delivery, ack the redelivery; read deliveryAttempt.
    const deliveries = [];
    await new Promise((resolve) => {
      const s = sub.on("message", (m) => {
        deliveries.push({ id: m.id, eventId: m.attributes.eventId, deliveryAttempt: m.deliveryAttempt ?? null });
        if (deliveries.length === 1) m.nack(); else m.ack();
        if (deliveries.length >= 3) { s.close().then(resolve); }
      });
      setTimeout(() => s.close().then(resolve), 15000);
    });
    out.deliveries = deliveries;
    const dlqSub = pubsub.subscription("analytics-dlq");
    const dlqDeliveries = [];
    if (dlq === "created") {
      await new Promise((resolve) => {
        const s = dlqSub.on("message", (m) => { dlqDeliveries.push(m.deliveryAttempt ?? null); m.nack(); if (dlqDeliveries.length >= 3) s.close().then(resolve); });
        setTimeout(() => s.close().then(resolve), 15000);
      });
    }
    out.deadLetterDeliveryAttempts = dlqDeliveries;
    const [meta] = await sub.getMetadata();
    out.subscriptionDefaults = { ackDeadlineSeconds: meta.ackDeadlineSeconds, messageRetentionDuration: meta.messageRetentionDuration, expirationPolicy: meta.expirationPolicy ?? null };
  } else if (phase === "stopped") {
    const topic = pubsub.topic("clicks");
    const t0 = now();
    out.defaultPublishWhileStopped = { ...(await race(topic.publishMessage({ data: Buffer.from("x") }), 20000)), ms: Math.round(now() - t0) };
    const bounded = pubsub.topic("clicks", { gaxOpts: { timeout: 1500 } });
    const t1 = now();
    out.boundedPublishWhileStopped = { ...(await race(bounded.publishMessage({ data: Buffer.from("y") }), 20000)), ms: Math.round(now() - t1) };
  } else if (phase === "restarted") {
    const t0 = now();
    out.publishAfterEmulatorRestart = { ...(await race(pubsub.topic("clicks", { gaxOpts: { timeout: 3000 } }).publishMessage({ data: Buffer.from("z") }), 20000)), ms: Math.round(now() - t0) };
    out.topicsAfterRestart = (await pubsub.getTopics())[0].map((t) => t.name);
  }
  console.log(JSON.stringify(out, null, 2));
  await pubsub.close();
  process.exit(0);
}
main().catch((error) => { console.error(error); process.exit(1); });
