

interface AutoDispatchOptions {
  taskId: string;
  taskTitle: string;
  agentId: string | null;
  agentName: string;
  workspaceId?: string;
}

/**
 * Shared utility function to trigger auto-dispatch for a task
 * Used in MissionQueue and TaskModal to eliminate duplication
 */
export async function triggerAutoDispatch(options: AutoDispatchOptions): Promise<{ success: boolean; error?: string }> {
  const { taskId, taskTitle, agentId, agentName, workspaceId } = options;

  if (!agentId) {
    return { success: false, error: 'No agent ID provided for dispatch' };
  }

  try {
    const dispatchRes = await fetch(`/api/tasks/${taskId}/dispatch`, {
      method: 'POST',
    });

    if (dispatchRes.ok) {
      console.log(`[Auto-Dispatch] Task "${taskTitle}" auto-dispatched to ${agentName}`);
      return { success: true };
    } else {
      const errorData = await dispatchRes.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[Auto-Dispatch] Failed for task "${taskTitle}":`, errorData);
      return { success: false, error: errorData.error || 'Dispatch failed' };
    }
  } catch (dispatchError) {
    const errorMessage = dispatchError instanceof Error ? dispatchError.message : 'Unknown error';
    console.error(`[Auto-Dispatch] Error for task "${taskTitle}":`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if a task should trigger auto-dispatch when status or assignment changes
 * Returns true if:
 * 1. Status changed to 'in_progress' and task has assigned agent
 * 2. Status changed to 'assigned' and task has assigned agent
 * 3. Agent was just assigned (previousAgentId was null, now has agent)
 */
export function shouldTriggerAutoDispatch(
  previousStatus: string | undefined,
  newStatus: string,
  assignedAgentId: string | null,
  previousAgentId?: string | null
): boolean {
  const hasAssignedAgent = !!assignedAgentId;
  
  if (!hasAssignedAgent) {
    return false;
  }

  // Case 1: Status changed to 'in_progress'
  const wasNotInProgress = previousStatus !== 'in_progress';
  const isNowInProgress = newStatus === 'in_progress';
  if (wasNotInProgress && isNowInProgress) {
    return true;
  }

  // Case 2: Status changed to 'assigned'
  const wasNotAssigned = previousStatus !== 'assigned';
  const isNowAssigned = newStatus === 'assigned';
  if (wasNotAssigned && isNowAssigned) {
    return true;
  }

  // Case 3: Agent was just assigned (for any dispatchable status)
  const agentJustAssigned = !previousAgentId && !!assignedAgentId;
  const dispatchableStatuses = ['inbox', 'assigned', 'in_progress'];
  if (agentJustAssigned && dispatchableStatuses.includes(newStatus)) {
    return true;
  }

  return false;
}