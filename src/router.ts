export type HttpRouteHandler = (request: Request, match: URLPatternResult) => Response | Promise<Response>;

type HttpRoute = {
  pattern: URLPattern;
  handler: HttpRouteHandler;
  method: string;
};

export type HttpMethod = "get" | "post" | "delete" | "patch" | "put" | "options";

export class HttpRouter {
  #routes: HttpRoute[] = [];

  get = (pattern: URLPatternInput, handler: HttpRouteHandler) => this.#use("get", pattern, handler);
  post = (pattern: URLPatternInput, handler: HttpRouteHandler) => this.#use("post", pattern, handler);
  put = (pattern: URLPatternInput, handler: HttpRouteHandler) => this.#use("put", pattern, handler);
  delete = (pattern: URLPatternInput, handler: HttpRouteHandler) => this.#use("delete", pattern, handler);

  all = (pattern: URLPatternInput, handler: Partial<Record<HttpMethod, HttpRouteHandler>> | HttpRouteHandler) => {
    if (typeof handler === "object") {
      for (const [method, h] of Object.entries(handler)) {
        this.#use(method as HttpMethod, pattern, h);
      }
    } else {
      this.#use("all", pattern, handler);
    }
  };

  #use = (method: HttpMethod | "all", pattern: string | URLPatternInput, handler: HttpRouteHandler) => {
    if (typeof pattern === "string") {
      this.#routes.push({
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
      this.#routes.push({ method, pattern: new URLPattern(pattern), handler });
    }
  };

  async handleRequest(request: Request): Promise<Response> {
    for (const route of this.#routes) {
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

  async handleEvent(event: Deno.RequestEvent) {
    const response = await this.handleRequest(event.request);
    await event.respondWith(response);
  }

  async handleConnection(conn: Deno.Conn) {
    for await (const event of Deno.serveHttp(conn)) {
      this.handleEvent(event);
    }
  }

  async serve(listener: Deno.Listener) {
    for await (const conn of listener) {
      this.handleConnection(conn);
    }
  }
}
