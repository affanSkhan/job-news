import {createNeonAuth} from "@neondatabase/auth/next/server";
const baseUrl=process.env.NEON_AUTH_BASE_URL||"http://localhost:3000/auth";
const secret=process.env.NEON_AUTH_COOKIE_SECRET||"jobnews-development-secret-please-configure-32chars";
export const auth=createNeonAuth({baseUrl,cookies:{secret}});