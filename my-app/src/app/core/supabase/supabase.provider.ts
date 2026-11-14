import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT');

export function provideSupabase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SUPABASE_CLIENT,
      useFactory: (): SupabaseClient => {
        const { supabasePublishableKey, supabaseUrl } = environment;
        if (!supabaseUrl || !supabasePublishableKey) {
          throw new Error(
            'Set supabaseUrl and supabasePublishableKey in src/environments/environment.ts.',
          );
        }

        return createClient(supabaseUrl, supabasePublishableKey, {
          auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            persistSession: true,
          },
        });
      },
    },
  ]);
}
