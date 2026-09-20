import type {NextConfig} from "next";

const nextConfig:NextConfig={
  poweredByHeader:false,
  compress:true,
  serverExternalPackages:["@huggingface/transformers","pdf-parse","@napi-rs/canvas"]
};

export default nextConfig;
