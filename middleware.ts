import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the origin from the request
  const origin = request.headers.get("origin");

  // List of allowed origins (ChatGPT sandbox, Claude, etc.)
  const allowedOrigins = [
    /^https:\/\/.*\.oaiusercontent\.com$/,  // ChatGPT sandbox
    /^https:\/\/chatgpt\.com$/,
    /^https:\/\/chat\.openai\.com$/,
    /^https:\/\/.*\.claude\.ai$/,
    /^https:\/\/claude\.com$/,
    /^https:\/\/dev\.askmymoney\.ai$/, // Allow local dev domain
  ];

  // Check if origin is allowed
  const isAllowedOrigin = origin && (
    allowedOrigins.some(pattern => pattern.test(origin)) ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  );

  // Determine which origin to use in response
  // Be more permissive in development to allow for HMR and other Next.js dev features
  const allowOrigin = isAllowedOrigin
    ? origin
    : process.env.NODE_ENV === "development"
    ? "*"
    : "null";

  // Define Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.claude.ai https://chat.openai.com https://cdn.plaid.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data:",
    `frame-src 'self' https://*.claude.ai https://*.oaiusercontent.com https://chat.openai.com https://cdn.plaid.com`,
    "connect-src 'self' https://*.claude.ai https://chat.openai.com https://*.plaid.com",
    `base-uri 'self' ${process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://dev.askmymoney.ai"}`,
    "form-action 'self'",
    "frame-ancestors 'self' https://*.claude.ai https://*.oaiusercontent.com https://chat.openai.com",
  ].join("; ");

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Credentials": "true", // Required for cookies/auth
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, Next-Action, Next-Router-State-Tree, next-hmr-refresh",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Get the response
  const response = NextResponse.next();

  // Set CSP header
  response.headers.set("Content-Security-Policy", csp.replace(/\s{2,}/g, ' ').trim());

  // Set CORS headers for all requests
  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  if (isAllowedOrigin || process.env.NODE_ENV === 'development') {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Next-Action, Next-Router-State-Tree, next-hmr-refresh");

  // Expose headers that OAuth/MCP clients need
  response.headers.set("Access-Control-Expose-Headers", "WWW-Authenticate, Location, Content-Type, Authorization");

  return response;
}

export const config = {
  matcher: [
    // Match all routes to handle CORS for server actions and API routes
    "/(.*)",
  ],
};
