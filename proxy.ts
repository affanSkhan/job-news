import {auth} from "./lib/auth/server";

export default auth.middleware({loginUrl:"/auth?next=/account"});

export const config={
  matcher:[
    "/account/:path*",
    "/admin/:path*"
  ]
};
