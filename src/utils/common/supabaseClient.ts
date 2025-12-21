import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export let supabase: ReturnType<typeof createClient> | undefined;

export const getSupabaseClient = (configService: ConfigService) => {
  const url = configService.get<string>('SUPABASE_URL');
  const key = configService.get<string>('SUPABASE_ANON_KEY');

  if (!url || !key) {
    throw new Error('Supabase environment variables missing');
  }

  if (!supabase) {
    supabase = createClient(url, key);
  }

  return supabase as SupabaseClient;
};
