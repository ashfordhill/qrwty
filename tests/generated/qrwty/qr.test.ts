// Generated standard behavior checks. Run only on disposable local fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
test("qrwty/qr: CRUD, isolation, validation and logout", async () => {
  assert.equal(process.env.JEEVES_TEST_ISOLATED, "1", "Requires a disposable fixture");
  const base = process.env.JEEVES_TEST_URL;
  assert.ok(base, "Set JEEVES_TEST_URL");
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const origin = process.env.JEEVES_TEST_PUBLIC_ORIGIN;
  assert.ok(origin, "Set JEEVES_TEST_PUBLIC_ORIGIN to the fixture origin");
  const register = async () => {
    const res = await fetch(base + "/auth/register", {method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify({email:randomUUID()+"@example.test",password:"isolated-test-password"})});
    assert.equal(res.status,201); const user=await res.json();
    return {cookie:res.headers.get("set-cookie").split(";")[0],"x-csrf-token":user.csrfToken,origin,"content-type":"application/json"};
  };
  const alice=await register(); const bob=await register();
  const input = {"destination":"https://example.test/original","title":"sample"};
  const path = "/api/qr";
  const ops = ["create","read","list","update"];
  const assertRow = row => { assert.match(row.id,/^[a-f0-9-]{36}$/); assert.ok(Number.isFinite(Date.parse(row.createdAt))); assert.equal(row.ownerId,undefined);
    assert.equal(row["destination"], input["destination"] ?? null);
    assert.equal(row["title"], input["title"] ?? null);
  };
  let id=process.env.JEEVES_TEST_RESOURCE_ID;
  if (ops.includes("create")) {
    assert.equal((await fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)})).status,401);
    const invalids=[{...input,ownerId:randomUUID()},{...input,id:randomUUID()},{...input,unknown:"forbidden"},{...input,createdAt:new Date().toISOString()}];
    invalids.push({...input,"destination":"ftp://example.test"},{...input,"destination":"https://user:password@example.test"});
    { const missing={...input}; delete missing["destination"]; invalids.push(missing); }
    invalids.push({...input,"title":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"});
    for (const invalid of invalids) assert.equal((await fetch(base+path,{method:"POST",headers:alice,body:JSON.stringify(invalid)})).status,400);
    const created=await fetch(base+path,{method:"POST",headers:alice,body:JSON.stringify(input)}); assert.equal(created.status,201);
    const row=await created.json(); assertRow(row); id=row.id;
  }
  assert.ok(id,"Set JEEVES_TEST_RESOURCE_ID for a resource without create");
  if (ops.includes("read")) {
    assert.equal((await fetch(base+path+"/"+id)).status,401);
    assert.equal((await fetch(base+path+"/"+id,{headers:bob})).status,404);
    const row=await (await fetch(base+path+"/"+id,{headers:alice})).json(); assert.equal(row.id,id); assertRow(row);
  }
  if (ops.includes("list")) {
    const own=await (await fetch(base+path,{headers:alice})).json(); assert.ok(own.items.some(row => row.id === id));
    const other=await (await fetch(base+path,{headers:bob})).json(); assert.ok(!other.items.some(row => row.id === id));
    assert.equal((await fetch(base+path+"?limit=101",{headers:alice})).status,400);
    assert.equal((await fetch(base+path+"?cursor=invalid",{headers:alice})).status,400);
  }
  if (ops.includes("update")) {
    input["destination"]="https://example.test/updated";
    assert.equal((await fetch(base+path+"/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(input)})).status,401);
    assert.equal((await fetch(base+path+"/"+id,{method:"PATCH",headers:bob,body:JSON.stringify(input)})).status,404);
    const updated=await fetch(base+path+"/"+id,{method:"PATCH",headers:alice,body:JSON.stringify(input)}); assert.equal(updated.status,200); assertRow(await updated.json());
    if (ops.includes("read")) assertRow(await (await fetch(base+path+"/"+id,{headers:alice})).json());
    assert.equal((await fetch(base+path+"/"+id,{method:"PATCH",headers:{...alice,"x-csrf-token":"wrong"},body:JSON.stringify(input)})).status,403);
  }
  assert.equal((await fetch(base+"/auth/logout",{method:"POST",headers:alice,body:"{}"})).status,204);
  assert.equal((await fetch(base+"/auth/session",{headers:alice})).status,401);
});
