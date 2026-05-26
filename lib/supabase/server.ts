import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

/** 服务端 Service Role 客户端（绕过 RLS，仅用于 API Route） */
export function getServiceSupabase(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error("未配置 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_URL");
  }
  if (!serviceKey) {
    throw new Error("未配置 SUPABASE_SERVICE_ROLE_KEY");
  }

  serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return serviceClient;
}
