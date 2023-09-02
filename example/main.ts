import { HttpRouter } from "../mod.ts";

type User = { name: string };
const users: Record<string, User> = {
  "1": { name: "John Doe" },
  "2": { name: "Jane Doe" },
};

const listener = Deno.listen({ port: 8080 });

const router = new HttpRouter();

router.get("/users/:id", (_req, match) => {
  if (!match.pathname.groups.id) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }

  const user = users[match.pathname.groups.id];

  if (!user) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }

  return Response.json(user, { status: 200 });
});

router.put("/users/:id", async (req, match) => {
  if (!match.pathname.groups.id) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }

  const user = await req.json();
  users[match.pathname.groups.id] = user;
  return Response.json(user, { status: 200 });
});

router.all("*", (_match, _req) => {
  return Response.json({ message: "Not Found" }, { status: 404 });
});

await router.serve(listener);
