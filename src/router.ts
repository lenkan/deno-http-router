export type HttpRouteHandler = (request: Request, match: URLPatternResult) => Response | Promise<Response>;

type HttpRoute = {
  pattern: URLPattern;
  handler: HttpRouteHandler;
  method: string;
};

export type HttpMethod = "get" | "post" | "delete" | "patch" | "put" | "options" | "head";
export type HttpRouteMethod = (pattern: URLPatternInput, handler: HttpRouteHandler) => HttpRouter;

export interface HttpRouter {
  (request: Request): Promise<Response>;
  all: (
    pattern: URLPatternInput,
    handler: Partial<Record<HttpMethod, HttpRouteHandler>> | HttpRouteHandler
  ) => HttpRouter;
  get: HttpRouteMethod;
  post: HttpRouteMethod;
  put: HttpRouteMethod;
  delete: HttpRouteMethod;
  patch: HttpRouteMethod;
  options: HttpRouteMethod;
  head: HttpRouteMethod;
  serve(listener: Deno.Listener): Promise<void>;
}

export function createRouter(): HttpRouter {
  const routes: HttpRoute[] = [];

  const all = (pattern: URLPatternInput, handler: Partial<Record<HttpMethod, HttpRouteHandler>> | HttpRouteHandler) => {
    if (typeof handler === "object") {
      for (const [method, h] of Object.entries(handler)) {
        use(method as HttpMethod)(pattern, h);
      }
    } else {
      use("all")(pattern, handler);
    }

    return instance;
  };

  const use = (method: HttpMethod | "all") => (pattern: string | URLPatternInput, handler: HttpRouteHandler) => {
    if (typeof pattern === "string") {
      routes.push({
        method,
        pattern: new URLPattern({
          protocol: "http{s}?",
          username: "*",
          password: "*",
          hostname: "*",
          port: "*",
          pathname: pattern,
          search: "*",
          hash: "*",
        }),
        handler,
      });
    } else {
      routes.push({ method, pattern: new URLPattern(pattern), handler });
    }

    return instance;
  };

  async function handleRequest(request: Request): Promise<Response> {
    for (const route of routes) {
      if (route.method.toUpperCase() === "ALL" || route.method.toUpperCase() === request.method.toUpperCase()) {
        const url = new URL(request.url, "http://example.com");
        const result = route.pattern.exec(url);

        if (result) {
          const response = await route.handler(request, result);
          return response;
        }
      }
    }

    throw new Error("Unhandled request");
  }

  async function handleEvent(event: Deno.RequestEvent) {
    const response = await handleRequest(event.request);
    await event.respondWith(response);
  }

  async function handleConnection(conn: Deno.Conn) {
    for await (const event of Deno.serveHttp(conn)) {
      handleEvent(event);
    }
  }

  async function serve(listener: Deno.Listener) {
    for await (const conn of listener) {
      handleConnection(conn);
    }
  }

  const instance = Object.assign(handleRequest, {
    get: use("get"),
    post: use("post"),
    delete: use("delete"),
    patch: use("patch"),
    put: use("put"),
    options: use("options"),
    head: use("head"),
    all,
    serve,
  });

  return instance;
}
