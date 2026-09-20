import {neon,type NeonQueryFunction} from "@neondatabase/serverless";
export type Db=NeonQueryFunction<false,false>;
export function getDb():Db|null{const url=process.env.DATABASE_URL;if(!url)return null;return neon(url);}