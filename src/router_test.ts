import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.198.0/assert/mod.ts";

import { HttpRouter } from "./router.ts";

const baseurl = "http://example.com";

function createRequest(path: string) {
  return new Request(new URL(path, baseurl));
}

Deno.test("get random json body", async () => {
  const router = new HttpRouter();
  const body = { message: crypto.randomUUID() };
  router.get("/", () => Response.json(body));

  const response = await router.handleRequest(
    new Request(new URL("/", baseurl)),
  );

  assertEquals(await response.json(), body);
});

Deno.test("match path parameter", async () => {
  const router = new HttpRouter();

  router.get("/", () => new Response("not found"));
  router.get("/:id", (_, match) => new Response(match.pathname.groups.id));

  const id = crypto.randomUUID();
  const response1 = await router.handleRequest(createRequest("/"));
  const response2 = await router.handleRequest(createRequest("/" + id));

  assertEquals(await response1.text(), "not found");
  assertEquals(await response2.text(), id);
});

Deno.test("rejects if no match", async () => {
  const router = new HttpRouter();

  router.get("/", () => new Response("ok"));

  await assertRejects(() => router.handleRequest(createRequest("/abc")));
});

Deno.test("can use fallback if no match", async () => {
  const router = new HttpRouter();

  router.get("/", () => new Response("ok"));
  router.get("/abcd", () => new Response("ok"));
  router.all("*", () => new Response("no match"));

  const response = await router.handleRequest(createRequest("/abc"));
  assertEquals(await response.text(), "no match");
});
