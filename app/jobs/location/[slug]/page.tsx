import {redirect} from "next/navigation";

export default async function JobLocationRedirect({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  redirect("/locations/"+slug);
}
