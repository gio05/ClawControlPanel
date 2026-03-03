/**
 * Task Completion Poller
 * 
 * Polls OpenClaw Gateway sessions to detect TASK_COMPLETE messages from agents
 * and automatically updates task status in Mission Control.
 * 
 * This is useful when the gateway runs on a remote server that cannot
 * reach Mission Control's API directly.
 */

import { getOpenClawClient } from './openclaw/client';
import { queryAll, queryOne, run } from './db';
import { broadcast } from './events';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Agent, OpenClawSession } from './types';

// Pattern to detect task completion messages
const TASK_COMPLETE_PATTERN = /TASK_COMPLETE:\s*(.+?)(?:\s*\||\s*$)/i;
const PROGRESS_UPDATE_PATTERN = /PROGRESS_UPDATE:\s*(.+?)(?:\s*\||\s*$)/i;
const BLOCKED_PATTERN = /BLOCKED:\s*(.+?)(?:\s*\||\s*$)/i;

// Track which messages we've already processed (by message index per session)
const processedMessages = new Map<string, number>();

interface PollResult {
  sessionsChecked: number;
  tasksUpdated: number;
  errors: string[];
  details: {
    sessionKey: string;
    taskId?: string;
    action: string;
    message?: string;
  }[];
}

interface SessionMessage {
  role?: string;
  content?: string | ContentPart[];
  text?: string;
  message?: string;
  timestamp?: string;
  createdAt?: string;
  created_at?: string;
}

interface ContentPart {
  type: string;
  text?: string;
  thinking?: string;
}

/**
 * Extract text content from a session message
 * Handles both simple string content and OpenClaw's array format:
 * content: [{type: "text", text: "..."}, {type: "thinking", thinking: "..."}]
 */
function getMessageContent(msg: SessionMessage): string | null {
  if (typeof msg === 'string') return msg;
  
  // Handle array content (OpenClaw format)
  if (Array.isArray(msg.content)) {
    const textParts = msg.content
      .filter((part): part is ContentPart => part && typeof part === 'object')
      .filter(part => part.type === 'text' && part.text)
      .map(part => part.text);
    return textParts.length > 0 ? textParts.join('\n') : null;
  }
  
  // Handle simple string content
  if (typeof msg.content === 'string') return msg.content;
  
  return msg.text || msg.message || null;
}

/**
 * Poll all active sessions for task completion messages
 */
export async function pollForTaskCompletions(): Promise<PollResult> {
  const result: PollResult = {
    sessionsChecked: 0,
    tasksUpdated: 0,
    errors: [],
    details: [],
  };

  try {
    const client = getOpenClawClient();
    
    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch (err) {
        result.errors.push('Failed to connect to OpenClaw Gateway');
        return result;
      }
    }

    // Get all active sessions that are linked to tasks
    const activeSessions = queryAll<OpenClawSession & { task_id: string; task_title: string; task_status: string }>(
      `SELECT os.*, t.id as task_id, t.title as task_title, t.status as task_status
       FROM openclaw_sessions os
       JOIN tasks t ON os.task_id = t.id OR os.agent_id = t.assigned_agent_id
       WHERE os.status = 'active'
       AND t.status IN ('in_progress', 'assigned')
       ORDER BY os.updated_at DESC`
    );

    // Also check sessions for agents that have in_progress tasks
    const agentSessions = queryAll<OpenClawSession & { task_id: string; task_title: string; task_status: string; agent_name: string }>(
      `SELECT os.*, t.id as task_id, t.title as task_title, t.status as task_status, a.name as agent_name
       FROM openclaw_sessions os
       JOIN agents a ON os.agent_id = a.id
       JOIN tasks t ON t.assigned_agent_id = a.id
       WHERE os.status = 'active'
       AND t.status IN ('in_progress', 'assigned')
       ORDER BY os.updated_at DESC`
    );

    // Combine and deduplicate
    const sessionsToCheck = new Map<string, typeof activeSessions[0]>();
    for (const s of [...activeSessions, ...agentSessions]) {
      const key = `${s.openclaw_session_id}:${s.task_id}`;
      if (!sessionsToCheck.has(key)) {
        sessionsToCheck.set(key, s);
      }
    }

    const sessionEntries = Array.from(sessionsToCheck.entries());
    for (const [key, session] of sessionEntries) {
      result.sessionsChecked++;
      
      try {
        const sessionKey = `agent:main:${session.openclaw_session_id}`;
        
        // Get session history
        let history: SessionMessage[];
        try {
          history = await client.getSessionHistory(sessionKey) as SessionMessage[];
        } catch (err) {
          // Try without the agent:main: prefix
          try {
            history = await client.getSessionHistory(session.openclaw_session_id) as SessionMessage[];
          } catch {
            result.details.push({
              sessionKey,
              action: 'skipped',
              message: 'Could not fetch session history',
            });
            continue;
          }
        }

        if (!Array.isArray(history) || history.length === 0) {
          continue;
        }

        // Get the last processed message index for this session
        const lastProcessedIndex = processedMessages.get(key) || 0;
        
        // Only process new messages (from assistant/agent role)
        for (let i = lastProcessedIndex; i < history.length; i++) {
          const msg = history[i];
          const role = msg.role || '';
          
          // Only process assistant messages
          if (role !== 'assistant' && role !== 'agent') {
            continue;
          }

          const content = getMessageContent(msg);
          if (!content) continue;

          // Check for TASK_COMPLETE pattern
          const completeMatch = content.match(TASK_COMPLETE_PATTERN);
          if (completeMatch) {
            const summary = completeMatch[1].trim();
            
            // Check if task is still in_progress (avoid double-processing)
            const currentTask = queryOne<Task>('SELECT * FROM tasks WHERE id = ? AND status = ?', [session.task_id, 'in_progress']);
            if (!currentTask) {
              // Task already updated, skip
              continue;
            }
            
            // Update task status to review
            const now = new Date().toISOString();
            run(
              'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND status = ?',
              ['review', now, session.task_id, 'in_progress']
            );

            // Log activity
            run(
              `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [uuidv4(), session.task_id, session.agent_id, 'completed', summary, now]
            );

            // Log event
            run(
              `INSERT INTO events (id, type, task_id, agent_id, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [uuidv4(), 'task_completed', session.task_id, session.agent_id, `Task completed: ${summary}`, now]
            );

            // Update agent status
            run(
              'UPDATE agents SET status = ?, updated_at = ? WHERE id = ?',
              ['standby', now, session.agent_id]
            );

            // Close the OpenClaw session for this task
            run(
              `UPDATE openclaw_sessions SET status = ?, ended_at = ?, updated_at = ? 
               WHERE task_id = ? AND status = ?`,
              ['completed', now, now, session.task_id, 'active']
            );

            // Broadcast task update
            const updatedTask = queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [session.task_id]);
            if (updatedTask) {
              broadcast({ type: 'task_updated', payload: updatedTask });
            }

            // Broadcast agent status update
            const updatedAgent = queryOne<Agent>('SELECT * FROM agents WHERE id = ?', [session.agent_id]);
            if (updatedAgent) {
              broadcast({ type: 'agent_updated', payload: updatedAgent });
            }

            result.tasksUpdated++;
            result.details.push({
              sessionKey,
              taskId: session.task_id,
              action: 'completed',
              message: summary,
            });
          }

          // Check for PROGRESS_UPDATE pattern
          const progressMatch = content.match(PROGRESS_UPDATE_PATTERN);
          if (progressMatch) {
            const update = progressMatch[1].trim();
            const now = new Date().toISOString();

            // Log activity
            run(
              `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [uuidv4(), session.task_id, session.agent_id, 'progress', update, now]
            );

            result.details.push({
              sessionKey,
              taskId: session.task_id,
              action: 'progress',
              message: update,
            });
          }

          // Check for BLOCKED pattern
          const blockedMatch = content.match(BLOCKED_PATTERN);
          if (blockedMatch) {
            const blocker = blockedMatch[1].trim();
            const now = new Date().toISOString();

            // Log activity
            run(
              `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [uuidv4(), session.task_id, session.agent_id, 'blocked', blocker, now]
            );

            // Log event
            run(
              `INSERT INTO events (id, type, task_id, agent_id, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [uuidv4(), 'task_blocked', session.task_id, session.agent_id, `Blocked: ${blocker}`, now]
            );

            result.details.push({
              sessionKey,
              taskId: session.task_id,
              action: 'blocked',
              message: blocker,
            });
          }
        }

        // Update last processed index
        processedMessages.set(key, history.length);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Session ${session.openclaw_session_id}: ${errorMsg}`);
      }
    }

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(`Poll error: ${errorMsg}`);
  }

  return result;
}

/**
 * Start periodic polling (server-side only)
 */
let pollingInterval: NodeJS.Timeout | null = null;
let isPolling = false;

export function startPolling(intervalMs: number = 10000): void {
  if (pollingInterval) {
    console.log('[TaskPoller] Already running');
    return;
  }

  console.log(`[TaskPoller] Starting with ${intervalMs}ms interval`);
  
  pollingInterval = setInterval(async () => {
    if (isPolling) {
      console.log('[TaskPoller] Skipping - previous poll still running');
      return;
    }

    isPolling = true;
    try {
      const result = await pollForTaskCompletions();
      if (result.tasksUpdated > 0 || result.errors.length > 0) {
        console.log('[TaskPoller] Poll result:', {
          sessionsChecked: result.sessionsChecked,
          tasksUpdated: result.tasksUpdated,
          errors: result.errors.length,
        });
      }
    } catch (err) {
      console.error('[TaskPoller] Error:', err);
    } finally {
      isPolling = false;
    }
  }, intervalMs);
}

export function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[TaskPoller] Stopped');
  }
}

export function isPollingActive(): boolean {
  return pollingInterval !== null;
}

/**
 * Clear processed message cache (useful for testing)
 */
export function clearProcessedCache(): void {
  processedMessages.clear();
}
