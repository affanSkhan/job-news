import {auth} from "./auth/server";
import {getDb} from "./db";

export type CurrentUser={id:string;email?:string|null;name?:string|null};

export async function getCurrentUser():Promise<CurrentUser|null>{
  try{
    const result:any=await auth.getSession();
    const session=result?.data?.session||result?.data||result?.session||null;
    const user=session?.user||result?.user||result?.data?.user||null;
    if(!user?.id)return null;
    return {id:String(user.id),email:user.email??null,name:user.name??null};
  }catch(error){
    console.error("[auth] getCurrentUser failed",error);
    return null;
  }
}

export async function ensureProfile(user:CurrentUser){
  const sql=getDb();
  if(!sql)return null;
  await sql.query(
    "INSERT INTO public.profiles(id,email,full_name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING",
    [user.id,user.email||null,user.name||""]
  );
  const rows=await sql.query("SELECT * FROM public.profiles WHERE id=$1 LIMIT 1",[user.id]);
  return rows[0]||null;
}