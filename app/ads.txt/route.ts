export const dynamic="force-dynamic";

export async function GET(){
  const raw=(process.env.NEXT_PUBLIC_ADSENSE_ID||"").trim();
  const match=raw.match(/(?:ca-)?pub-([0-9]{16})/);
  const body=match
    ? `google.com, pub-${match[1]}, DIRECT, f08c47fec0942fa0\n`
    : "# RolePilot AdSense configuration pending\n";

  return new Response(body,{
    status:200,
    headers:{
      "content-type":"text/plain; charset=utf-8",
      "cache-control":"public, max-age=3600, s-maxage=3600"
    }
  });
}
