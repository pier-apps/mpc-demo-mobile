import { createClient } from '@supabase/supabase-js';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import { storageMKKV } from '../../core/storage';

export const supabase = createClient(
  'https://wnpphaccyjobbojjkvat.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducHBoYWNjeWpvYmJvamprdmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTIxMDU0MzAsImV4cCI6MjAwNzY4MTQzMH0.zZStzJDj_OGENGRX1a7bx-hjYt6ENdDZJbXlpHSwTDI',
  {
    auth: {
      storage: storageMKKV,
    },
  }
);

const PIER_MPC_SERVER_HTTP_URL = 'https://mpc.pierwallet.com';

export const api: any = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: `${PIER_MPC_SERVER_HTTP_URL}/trpc`,
      async headers() {
        const session = await supabase.auth.getSession();

        if (session.error) {
          throw new Error(session.error.message);
        }
        if (!session.data.session) {
          throw new Error('failed to login');
        }

        return {
          authorization: `Bearer ${session.data.session.access_token}`,
        };
      },
    }),
  ],
});
