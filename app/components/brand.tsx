import Image from "next/image";
import Link from "next/link";

export default function Brand({href="/"}:{href?:string}){
  return <Link href={href} className="brand-lockup" aria-label="RolePilot home">
    <Image src="/rolepilot-mark.png" alt="" width={38} height={38} priority className="brand-mark"/>
    <span className="brand-wordmark">Role<span>Pilot</span></span>
  </Link>;
}
