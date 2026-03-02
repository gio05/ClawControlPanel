import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';
import type { Agent } from '@/lib/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]/workspace
 *
 * Fetches the agent's workspace files (SOUL.md, USER.md, AGENTS.md) from the
 * OpenClaw Gateway and returns them. For gateway agents only.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const agent = queryOne<Agent>('SELECT * FROM agents WHERE id = ?', [id]);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!agent.gateway_agent_id) {
      return NextResponse.json(
        { error: 'Agent is not a gateway agent' },
        { status: 400 }
      );
    }

    const client = getOpenClawClient();
    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch {
        return NextResponse.json(
          { error: 'Failed to connect to OpenClaw Gateway' },
          { status: 503 }
        );
      }
    }

    const workspaceFiles = await client.getAgentWorkspaceFiles(agent.gateway_agent_id);

    return NextResponse.json({
      soul_md: workspaceFiles.soul_md,
      user_md: workspaceFiles.user_md,
      agents_md: workspaceFiles.agents_md,
    });
  } catch (error) {
    console.error('Failed to fetch agent workspace files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace files' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/[id]/workspace
 *
 * Fetches the agent's workspace files from the OpenClaw Gateway and
 * syncs them into the local database. For gateway agents only.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const agent = queryOne<Agent>('SELECT * FROM agents WHERE id = ?', [id]);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!agent.gateway_agent_id) {
      return NextResponse.json(
        { error: 'Agent is not a gateway agent' },
        { status: 400 }
      );
    }

    const client = getOpenClawClient();
    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch {
        return NextResponse.json(
          { error: 'Failed to connect to OpenClaw Gateway' },
          { status: 503 }
        );
      }
    }

    const workspaceFiles = await client.getAgentWorkspaceFiles(agent.gateway_agent_id);

    // Only update fields that were successfully fetched
    const updates: string[] = [];
    const values: unknown[] = [];

    if (workspaceFiles.soul_md !== null) {
      updates.push('soul_md = ?');
      values.push(workspaceFiles.soul_md);
    }
    if (workspaceFiles.user_md !== null) {
      updates.push('user_md = ?');
      values.push(workspaceFiles.user_md);
    }
    if (workspaceFiles.agents_md !== null) {
      updates.push('agents_md = ?');
      values.push(workspaceFiles.agents_md);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);
      run(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const updatedAgent = queryOne<Agent>('SELECT * FROM agents WHERE id = ?', [id]);
    
    // Provide helpful message if sync didn't work
    const noFilesFound = !workspaceFiles.soul_md && !workspaceFiles.user_md && !workspaceFiles.agents_md;
    
    return NextResponse.json({
      synced: updates.length > 0,
      agent: updatedAgent,
      workspace: workspaceFiles,
      ...(noFilesFound && {
        message: 'The OpenClaw Gateway does not support workspace.read RPC. Workspace files (SOUL.md, USER.md, AGENTS.md) must be entered manually in Mission Control.',
        hint: 'Edit the agent and paste the workspace file contents into the SOUL.md, USER.md, and AGENTS.md tabs.'
      }),
    });
  } catch (error) {
    console.error('Failed to sync agent workspace files:', error);
    return NextResponse.json(
      { error: 'Failed to sync workspace files' },
      { status: 500 }
    );
  }
}
