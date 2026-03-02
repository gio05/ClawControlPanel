import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, run, transaction } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';
import type { Agent } from '@/lib/types';

interface ImportAgentRequest {
  gateway_agent_id: string;
  name: string;
  model?: string;
  workspace_id?: string;
  soul_md?: string;
  user_md?: string;
  agents_md?: string;
}

interface ImportRequest {
  agents: ImportAgentRequest[];
}

// POST /api/agents/import - Import one or more agents from the OpenClaw Gateway
export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();

    if (!body.agents || !Array.isArray(body.agents) || body.agents.length === 0) {
      return NextResponse.json(
        { error: 'At least one agent is required in the agents array' },
        { status: 400 }
      );
    }

    // Validate each agent
    for (const agentReq of body.agents) {
      if (!agentReq.gateway_agent_id || !agentReq.name) {
        return NextResponse.json(
          { error: 'Each agent must have gateway_agent_id and name' },
          { status: 400 }
        );
      }
    }

    // Check for conflicts (already imported)
    const existingImports = queryAll<Agent>(
      `SELECT * FROM agents WHERE gateway_agent_id IS NOT NULL`
    );
    const importedGatewayIds = new Set(existingImports.map((a) => a.gateway_agent_id));

    const results: { imported: Agent[]; skipped: { gateway_agent_id: string; reason: string }[] } = {
      imported: [],
      skipped: [],
    };

    // Track agents that need workspace file sync (id -> gateway_agent_id)
    const agentsToSync: { id: string; gateway_agent_id: string }[] = [];

    transaction(() => {
      const now = new Date().toISOString();

      for (const agentReq of body.agents) {
        // Skip if already imported
        if (importedGatewayIds.has(agentReq.gateway_agent_id)) {
          results.skipped.push({
            gateway_agent_id: agentReq.gateway_agent_id,
            reason: 'Already imported',
          });
          continue;
        }

        const id = uuidv4();
        const workspaceId = agentReq.workspace_id || 'default';

        run(
          `INSERT INTO agents (id, name, role, description, avatar_emoji, is_master, workspace_id, model, soul_md, user_md, agents_md, source, gateway_agent_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            agentReq.name,
            'Imported Agent',
            `Imported from OpenClaw Gateway (${agentReq.gateway_agent_id})`,
            '🔗',
            0,
            workspaceId,
            agentReq.model || null,
            agentReq.soul_md || null,
            agentReq.user_md || null,
            agentReq.agents_md || null,
            'gateway',
            agentReq.gateway_agent_id,
            now,
            now,
          ]
        );

        // Log event
        run(
          `INSERT INTO events (id, type, agent_id, message, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), 'agent_joined', id, `${agentReq.name} imported from OpenClaw Gateway`, now]
        );

        const agent = queryOne<Agent>('SELECT * FROM agents WHERE id = ?', [id]);
        if (agent) {
          results.imported.push(agent);
          // Mark for workspace sync if no workspace files were provided in the request
          if (!agentReq.soul_md && !agentReq.user_md && !agentReq.agents_md) {
            agentsToSync.push({ id, gateway_agent_id: agentReq.gateway_agent_id });
          }
        }
      }
    });

    // After transaction completes, sync workspace files from gateway for each imported agent
    if (agentsToSync.length > 0) {
      const client = getOpenClawClient();
      let connected = client.isConnected();
      if (!connected) {
        try {
          await client.connect();
          connected = true;
        } catch {
          // If we can't connect, skip workspace sync but don't fail the import
          console.warn('Could not connect to OpenClaw Gateway for workspace sync');
        }
      }

      if (connected) {
        for (const { id, gateway_agent_id } of agentsToSync) {
          try {
            const workspaceFiles = await client.getAgentWorkspaceFiles(gateway_agent_id);
            
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

              // Update the agent in results with the synced workspace files
              const idx = results.imported.findIndex((a) => a.id === id);
              if (idx !== -1) {
                const updatedAgent = queryOne<Agent>('SELECT * FROM agents WHERE id = ?', [id]);
                if (updatedAgent) {
                  results.imported[idx] = updatedAgent;
                }
              }
            }
          } catch (err) {
            console.warn(`Failed to sync workspace files for agent ${gateway_agent_id}:`, err);
            // Continue with other agents
          }
        }
      }
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error('Failed to import agents:', error);
    return NextResponse.json(
      { error: 'Failed to import agents' },
      { status: 500 }
    );
  }
}
