// Debug endpoint to test RPC methods directly
import { NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, params } = body;
    
    if (!method) {
      return NextResponse.json({ error: 'Method required' }, { status: 400 });
    }
    
    const client = getOpenClawClient();
    await client.connect();
    
    console.log(`[Debug] Calling RPC: ${method}`, params);
    
    // Access the internal call method via any cast
    const result = await (client as any).call(method, params || {});
    
    console.log(`[Debug] RPC result:`, result);
    
    return NextResponse.json({ 
      success: true, 
      method,
      params,
      result 
    });
  } catch (error) {
    console.error('[Debug] RPC error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST with { method: "rpc.method", params: {...} }',
    examples: [
      { method: 'sessions.list', params: {} },
      { method: 'agents.list', params: {} },
      { method: 'sessions.history', params: { session_id: 'agent:main:xxx' } },
    ]
  });
}
