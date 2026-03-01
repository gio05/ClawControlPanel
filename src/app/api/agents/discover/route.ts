import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';
import type { Agent, DiscoveredAgent } from '@/lib/types';

// This route must always be dynamic - it queries live Gateway state + DB
export const dynamic = 'force-dynamic';

// Shape of an agent returned by the OpenClaw Gateway `agents.list` call
interface GatewayAgent {
  id?: string;
  name?: string;
  label?: string;
  model?: string;
  channel?: string;
  status?: string;
  // Workspace files — may be returned by the gateway under various field names
  soul_md?: string;
  soulMd?: string;
  soul?: string;
  user_md?: string;
  userMd?: string;
  user?: string;
  agents_md?: string;
  agentsMd?: string;
  agents?: string;
  [key: string]: unknown;
}

/**
 * Extract workspace file content from a gateway agent response.
 * Handles multiple possible field name conventions used by different gateway versions.
 */
function extractWorkspaceFile(ga: GatewayAgent, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = ga[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

// GET /api/agents/discover - Discover existing agents from the OpenClaw Gateway
export async function GET() {
  try {
    const client = getOpenClawClient();

    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch {
        return NextResponse.json(
          { error: 'Failed to connect to OpenClaw Gateway. Is it running?' },
          { status: 503 }
        );
      }
    }

    let gatewayAgents: GatewayAgent[];
    try {
      gatewayAgents = (await client.listAgents()) as GatewayAgent[];
    } catch (err) {
      console.error('Failed to list agents from Gateway:', err);
      return NextResponse.json(
        { error: 'Failed to list agents from OpenClaw Gateway' },
        { status: 502 }
      );
    }

    if (!Array.isArray(gatewayAgents)) {
      return NextResponse.json(
        { error: 'Unexpected response from Gateway agents.list' },
        { status: 502 }
      );
    }

    // Get all agents already imported from the gateway
    const existingAgents = queryAll<Agent>(
      `SELECT * FROM agents WHERE gateway_agent_id IS NOT NULL`
    );
    const importedGatewayIds = new Map(
      existingAgents.map((a) => [a.gateway_agent_id, a.id])
    );

    // Map gateway agents to our DiscoveredAgent type
    const discovered: DiscoveredAgent[] = gatewayAgents.map((ga) => {
      const gatewayId = ga.id || ga.name || '';
      const alreadyImported = importedGatewayIds.has(gatewayId);
      return {
        id: gatewayId,
        name: ga.name || ga.label || gatewayId,
        label: ga.label,
        model: ga.model,
        channel: ga.channel,
        status: ga.status,
        soul_md: extractWorkspaceFile(ga, 'soul_md', 'soulMd', 'soul'),
        user_md: extractWorkspaceFile(ga, 'user_md', 'userMd', 'user'),
        agents_md: extractWorkspaceFile(ga, 'agents_md', 'agentsMd', 'agents'),
        already_imported: alreadyImported,
        existing_agent_id: alreadyImported ? importedGatewayIds.get(gatewayId) : undefined,
      };
    });

    return NextResponse.json({
      agents: discovered,
      total: discovered.length,
      already_imported: discovered.filter((a) => a.already_imported).length,
    });
  } catch (error) {
    console.error('Failed to discover agents:', error);
    return NextResponse.json(
      { error: 'Failed to discover agents from Gateway' },
      { status: 500 }
    );
  }
}
