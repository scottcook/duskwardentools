import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Auth disabled - allow all requests through
  return NextResponse.next({ request });
}
