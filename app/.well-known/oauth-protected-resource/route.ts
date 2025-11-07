import { NextRequest } from "next/server";
import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

const handler = oAuthProtectedResourceMetadata(auth);

export const GET = async (request: NextRequest) => {
  console.log("[Auth] OAuth protected resource metadata requested", {
    path: request.nextUrl?.pathname,
    query: Object.fromEntries(request.nextUrl?.searchParams ?? []),
  });
  return handler(request);
};
