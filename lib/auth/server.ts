import {createNeonAuth} from "@neondatabase/auth/next/server";

const baseUrl=process.env.NEON_AUTH_BASE_URL;
const secret=process.env.NEON_AUTH_COOKIE_SECRET;

if(!baseUrl)console.warn("NEON_AUTH_BASE_URL is not configured; Neon Auth server session checks will fail.");
if(!secret)console.warn("NEON_AUTH_COOKIE_SECRET is not configured; Neon Auth server session caching may fail.");

export const auth=createNeonAuth({
  baseUrl:baseUrl||"http://localhost:3000/auth",
  cookies:{
    secret:secret||"rolepilot-development-secret-please-configure-32chars"
  }
});