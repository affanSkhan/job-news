import {auth} from "./lib/auth/server";

export default auth.middleware({loginUrl:"/auth?next=/account"});

export const config={
  matcher:[
    "/account/:path*",
    "/admin/:path*",
    "/api/saved-jobs/:path*",
    "/api/applications/:path*",
    "/api/profile/:path*",
    "/api/matches/:path*",
    "/api/alerts/:path*"
  ]
};