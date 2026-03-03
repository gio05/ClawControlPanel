import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, run } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';
import { broadcast } from '@/lib/events';
import { getProjectsPath, getMissionControlUrl } from '@/lib/config';
import type { Task, Agent, OpenClawSession } from '@/lib/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tasks/[id]/dispatch
 * 
 * Dispatches a task to its assigned agent's OpenClaw session.
 * Creates session if needed, sends task details to agent.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get task with agent info
    const task = queryOne<Task & { assigned_agent_name?: string; workspace_id: string }>(
      `SELECT t.*, a.name as assigned_agent_name, a.is_master
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_agent_id = a.id
       WHERE t.id = ?`,
      [id]
    );

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.assigned_agent_id) {
      return NextResponse.json(
        { error: 'Task has no assigned agent' },
        { status: 400 }
      );
    }

    // Get agent details
    const agent = queryOne<Agent>(
      'SELECT * FROM agents WHERE id = ?',
      [task.assigned_agent_id]
    );

    if (!agent) {
      return NextResponse.json({ error: 'Assigned agent not found' }, { status: 404 });
    }

    // Check if dispatching to the master agent while there are other orchestrators available
    if (agent.is_master) {
      // Check for other master agents in the same workspace (excluding this one)
      const otherOrchestrators = queryAll<{
        id: string;
        name: string;
        role: string;
      }>(
        `SELECT id, name, role
         FROM agents
         WHERE is_master = 1
         AND id != ?
         AND workspace_id = ?
         AND status != 'offline'`,
        [agent.id, task.workspace_id]
      );

      if (otherOrchestrators.length > 0) {
        return NextResponse.json({
          success: false,
          warning: 'Other orchestrators available',
          message: `There ${otherOrchestrators.length === 1 ? 'is' : 'are'} ${otherOrchestrators.length} other orchestrator${otherOrchestrators.length === 1 ? '' : 's'} available in this workspace: ${otherOrchestrators.map(o => o.name).join(', ')}. Consider assigning this task to them instead.`,
          otherOrchestrators,
        }, { status: 409 }); // 409 Conflict - indicating there's an alternative
      }
    }

    // Connect to OpenClaw Gateway
    const client = getOpenClawClient();
    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch (err) {
        console.error('Failed to connect to OpenClaw Gateway:', err);
        return NextResponse.json(
          { error: 'Failed to connect to OpenClaw Gateway' },
          { status: 503 }
        );
      }
    }

    // Get or create OpenClaw session for this agent AND this specific task
    // Each task gets its own dedicated session for tracking
    let session = queryOne<OpenClawSession>(
      'SELECT * FROM openclaw_sessions WHERE agent_id = ? AND task_id = ? AND status = ?',
      [agent.id, id, 'active']
    );

    const now = new Date().toISOString();
    
    // Build task message for agent (used both in spawn and fallback)
    const priorityEmoji = {
      low: '🔵',
      normal: '⚪',
      high: '🟡',
      urgent: '🔴'
    }[task.priority] || '⚪';

    // Get project path for deliverables
    const projectsPath = getProjectsPath();
    const projectDir = task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const taskProjectDir = `${projectsPath}/${projectDir}`;
    const missionControlUrl = getMissionControlUrl();

    const taskMessage = `${priorityEmoji} **NEW TASK ASSIGNED**

**Title:** ${task.title}
${task.description ? `**Description:** ${task.description}\n` : ''}
**Priority:** ${task.priority.toUpperCase()}
${task.due_date ? `**Due:** ${task.due_date}\n` : ''}
**Task ID:** ${task.id}

**OUTPUT DIRECTORY:** ${taskProjectDir}
Create this directory and save all deliverables there.

**OPTIONAL API calls** (only if reachable - these may fail if you're on a remote server):
1. Log activity: POST ${missionControlUrl}/api/tasks/${task.id}/activities
   Body: {"activity_type": "completed", "message": "Description of what was done"}
2. Register deliverable: POST ${missionControlUrl}/api/tasks/${task.id}/deliverables
   Body: {"deliverable_type": "file", "title": "File name", "path": "${taskProjectDir}/filename.html"}
3. Update status: PATCH ${missionControlUrl}/api/tasks/${task.id}
   Body: {"status": "review"}

**MANDATORY:** When complete, you MUST reply with this message (even if the API calls above fail):
\`TASK_COMPLETE: [brief summary of what you did]\`

This message is monitored by Mission Control and will update your task status automatically.

If you need help or clarification, ask the orchestrator.`;

    // Track whether spawn was successful (determines if we need chat.send fallback)
    let spawnSuccessful = false;

    if (!session) {
      // Spawn a new sub-agent session in OpenClaw Gateway for this task
      // Uses chat.spawn/sessions.spawn which creates a real background sub-agent run
      // The task parameter contains the full instruction - sub-agent starts working immediately
      // Session key format: agent:<agentId>:subagent:<uuid>
      const sessionId = uuidv4();
      
      // Determine the agent ID to spawn the sub-agent for
      // For gateway-imported agents, use their gateway_agent_id
      const targetAgentId = agent.gateway_agent_id || agent.name.toLowerCase().replace(/\s+/g, '-');
      const taskLabel = `task-${id.slice(0, 8)}`;
      
      // Parent session key - the agent's main session
      const parentSessionKey = `agent:main:${targetAgentId}`;
      
      let openclawSessionId: string;
      let runId: string | null = null;
      
      try {
        // Call spawn RPC on the Gateway to spawn a real sub-agent
        // The 'task' parameter is the full instruction - sub-agent begins working immediately
        // This is non-blocking and returns immediately with runId and childSessionKey
        const spawnResult = await client.spawnSubAgent({
          sessionKey: parentSessionKey,  // Parent session to spawn from
          task: taskMessage,  // Full task instruction including completion format
          label: taskLabel,
          agentId: targetAgentId,
          mode: 'run',  // One-shot mode for task execution
          cleanup: 'keep',  // Keep transcript for review
          runTimeoutSeconds: 3600,  // 1 hour timeout
        });
        
        if (spawnResult.status === 'accepted') {
          // The gateway returns the child session key in format: agent:<agentId>:subagent:<uuid>
          openclawSessionId = spawnResult.childSessionKey;
          runId = spawnResult.runId;
          spawnSuccessful = true;
          console.log(`[Dispatch] Spawned sub-agent in Gateway: ${openclawSessionId} (runId: ${runId}) for agent ${agent.name}`);
        } else {
          throw new Error('Sub-agent spawn rejected by Gateway');
        }
      } catch (spawnErr) {
        // If Gateway spawn fails, fall back to using agent's main session with chat.send
        console.warn(`[Dispatch] Failed to spawn sub-agent, will use chat.send fallback:`, (spawnErr as Error).message);
        openclawSessionId = parentSessionKey;
      }
      
      // Record the session in our local database
      run(
        `INSERT INTO openclaw_sessions (id, agent_id, openclaw_session_id, channel, status, task_id, session_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, agent.id, openclawSessionId, `task:${id}`, 'active', id, 'subagent', now, now]
      );

      session = queryOne<OpenClawSession>(
        'SELECT * FROM openclaw_sessions WHERE id = ?',
        [sessionId]
      );

      // Log session spawn event
      run(
        `INSERT INTO events (id, type, agent_id, message, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), 'agent_spawned', agent.id, `Sub-agent spawned for task: ${task.title}${runId ? ` (runId: ${runId})` : ''}`, now]
      );
      
      // Also log spawn activity in task_activities
      run(
        `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, agent.id, 'spawned', `Sub-agent spawned: ${agent.name} assigned to work on this task`, 
         JSON.stringify({ runId, childSessionKey: openclawSessionId, spawnSuccessful }), now]
      );
      
      // Broadcast agent_spawned event for real-time UI updates
      broadcast({
        type: 'agent_spawned',
        payload: {
          taskId: id,
          sessionId: openclawSessionId,
          agentName: agent.name,
          runId,
        },
      });
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create agent session' },
        { status: 500 }
      );
    }

    // Only send chat.send if spawn failed (fallback mode) or if session already existed
    // When spawn is successful, the sub-agent already received the task via the spawn command
    if (!spawnSuccessful) {
      try {
        // Fallback: Use sessionKey for routing to the agent's main session
        // Format depends on whether it's a gateway agent or local agent
        const sessionKey = session.openclaw_session_id.startsWith('agent:')
          ? session.openclaw_session_id
          : `agent:main:${session.openclaw_session_id}`;
          
        await client.call('chat.send', {
          sessionKey,
          message: taskMessage,
          idempotencyKey: `dispatch-${task.id}-${Date.now()}`
        });
        console.log(`[Dispatch] Sent task via chat.send to ${sessionKey}`);
      } catch (err) {
        console.error('Failed to send message to agent:', err);
        return NextResponse.json(
          { error: 'Failed to dispatch task to agent' },
          { status: 500 }
        );
      }
    }

    // Update task status to in_progress
    run(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
      ['in_progress', now, id]
    );

    // Broadcast task update
    const updatedTask = queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (updatedTask) {
      broadcast({
        type: 'task_updated',
        payload: updatedTask,
      });
    }

    // Update agent status to working
    run(
      'UPDATE agents SET status = ?, updated_at = ? WHERE id = ?',
      ['working', now, agent.id]
    );

    // Log dispatch event to events table
    const eventId = uuidv4();
    run(
      `INSERT INTO events (id, type, agent_id, task_id, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, 'task_dispatched', agent.id, task.id, `Task "${task.title}" dispatched to ${agent.name}${spawnSuccessful ? ' (via sub-agent spawn)' : ' (via chat.send)'}`, now]
    );

    // Log dispatch activity to task_activities table (for Activity tab)
    const activityId = crypto.randomUUID();
    run(
      `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [activityId, task.id, agent.id, 'status_changed', `Task dispatched to ${agent.name} - Agent is now working on this task`, now]
    );

    return NextResponse.json({
      success: true,
      task_id: task.id,
      agent_id: agent.id,
      session_id: session.openclaw_session_id,
      spawn_method: spawnSuccessful ? 'sessions.spawn' : 'chat.send',
      message: spawnSuccessful 
        ? 'Task dispatched via sub-agent spawn - agent is working in background'
        : 'Task dispatched via chat.send to agent main session'
    });
  } catch (error) {
    console.error('Failed to dispatch task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
