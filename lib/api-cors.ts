const DEFAULT_ALLOWED_HEADERS = "Content-Type, Authorization";
const DEFAULT_ALLOWED_METHODS = "POST, OPTIONS";

function parseAllowedOrigins(): string[] | null {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw || raw === "*") return null;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveAllowOrigin(requestOrigin: string | null): string {
  const allowedOrigins = parseAllowedOrigins();
  if (!allowedOrigins) {
    return requestOrigin ?? "*";
  }
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[0] ?? "*";
}

export function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin = resolveAllowOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function corsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export function jsonWithCors<T>(
  request: Request,
  body: T,
  init?: { status?: number; headers?: HeadersInit }
): Response {
  return Response.json(body, {
    status: init?.status ?? 200,
    headers: {
      ...getCorsHeaders(request),
      ...(init?.headers ?? {}),
    },
  });
}
