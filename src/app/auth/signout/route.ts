import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getPublicSupabaseEnv } from '@/lib/env';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  if (!getPublicSupabaseEnv()) {
    return NextResponse.redirect(`${origin}/`, { status: 302 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${origin}/`, { status: 302 });
}
