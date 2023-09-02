# Deno http router

Simple, zero dependency, module for http routing in deno. It uses the built in
URLPattern implementation for path matching.

## Example

```typescript
import { HttpRouter } from "../mod.ts";

type User = { name: string };
const users: Record<string, User> = {
  "1": { name: "John Doe" },
  "2": { name: "Jane Doe" },
};

const router = createRouter();

router.get("/users/:id", (_req, match) => {
  const user = users[match.pathname.groups.id];

  if (!user) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }

  return Response.json(user, { status: 200 });
});

router.put("/users/:id", async (req, match) => {
  const user = await req.json();
  users[match.pathname.groups.id] = user;
  return Response.json(user, { status: 200 });
});

router.all("*", (_match, _req) => {
  return Response.json({ message: "Not Found" }, { status: 404 });
});

Deno.serve({ port: 8080 }, router);
```
