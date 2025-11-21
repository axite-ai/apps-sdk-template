const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
const localUrl = "https://dev.askmymoney.ai";

// Use the Vercel URL if it exists (for Vercel deployments), otherwise default to the local reverse proxy URL.
export const baseURL = vercelUrl || localUrl;

