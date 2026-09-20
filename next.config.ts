import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader:false,
  compress:true,
  serverExternalPackages:["@huggingface/transformers"]
};
export default nextConfig;
