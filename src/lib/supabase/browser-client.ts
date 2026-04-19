import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { err, ok, type AppResult } from "@/lib/app-result";
import { getSupabasePublicConfig } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): AppResult<SupabaseClient> {
  const config = getSupabasePublicConfig();

  if (!config.ok) {
    return err(config.error);
  }

  if (!browserClient) {
    browserClient = createClient(config.data.url, config.data.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
      },
    });
  }

  return ok(browserClient);
}
