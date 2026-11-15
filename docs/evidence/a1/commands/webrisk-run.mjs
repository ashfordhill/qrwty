// A1: run the pack's Web Risk fixture (a verified copy) until SIGTERM, on the address given.
const [file, listen] = process.argv.slice(2);
const { startWebRisk } = await import(file);
const fixture = await startWebRisk(listen);
console.log(JSON.stringify({ event: "webrisk-listening", url: fixture.url }));
process.on("SIGTERM", async () => { await fixture.close(); process.exit(0); });
