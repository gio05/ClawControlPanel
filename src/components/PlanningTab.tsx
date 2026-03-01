'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Card,
  CardContent,
  Chip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as CircleIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { mcColors } from '@/theme/theme';

interface PlanningOption {
  id: string;
  label: string;
}

interface PlanningQuestion {
  question: string;
  options: PlanningOption[];
}

interface PlanningMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface PlanningState {
  taskId: string;
  sessionKey?: string;
  messages: PlanningMessage[];
  currentQuestion?: PlanningQuestion;
  isComplete: boolean;
  dispatchError?: string;
  spec?: {
    title: string;
    summary: string;
    deliverables: string[];
    success_criteria: string[];
    constraints: Record<string, unknown>;
  };
  agents?: Array<{
    name: string;
    role: string;
    avatar_emoji: string;
    soul_md: string;
    instructions: string;
  }>;
  isStarted: boolean;
}

interface PlanningTabProps {
  taskId: string;
  onSpecLocked?: () => void;
}

export function PlanningTab({ taskId, onSpecLocked }: PlanningTabProps) {
  const [state, setState] = useState<PlanningState | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [retryingDispatch, setRetryingDispatch] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const lastSubmissionRef = useRef<{ answer: string; otherText?: string } | null>(null);
  const currentQuestionRef = useRef<string | undefined>(undefined);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/planning`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
        currentQuestionRef.current = data.currentQuestion?.question;
      }
    } catch (err) {
      console.error('Failed to load planning state:', err);
      setError('Failed to load planning state');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setIsWaitingForResponse(false);
  }, []);

  const pollForUpdates = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const res = await fetch(`/api/tasks/${taskId}/planning/poll`);
      if (res.ok) {
        const data = await res.json();

        if (data.hasUpdates) {
          const newQuestion = data.currentQuestion?.question;
          const questionChanged = newQuestion && currentQuestionRef.current !== newQuestion;

          const freshRes = await fetch(`/api/tasks/${taskId}/planning`);
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            setState(freshData);
          } else {
            setState(prev => ({
              ...prev!,
              messages: data.messages,
              isComplete: data.complete,
              spec: data.spec,
              agents: data.agents,
              currentQuestion: data.currentQuestion,
              dispatchError: data.dispatchError,
            }));
          }

          if (questionChanged) {
            currentQuestionRef.current = newQuestion;
            setSelectedOption(null);
            setOtherText('');
            setIsSubmittingAnswer(false);
          }

          if (data.currentQuestion) {
            setIsSubmittingAnswer(false);
            setSubmitting(false);
          }

          if (data.dispatchError) {
            setError(`Planning completed but dispatch failed: ${data.dispatchError}`);
          }

          if (data.complete && onSpecLocked) {
            onSpecLocked();
          }

          if (data.currentQuestion || data.complete || data.dispatchError) {
            setIsWaitingForResponse(false);
            stopPolling();
          }
        }
      }
    } catch (err) {
      console.error('Failed to poll for updates:', err);
    } finally {
      isPollingRef.current = false;
    }
  }, [taskId, onSpecLocked, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setIsWaitingForResponse(true);

    pollingIntervalRef.current = setInterval(() => {
      pollForUpdates();
    }, 2000);

    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setSubmitting(false);
      setIsSubmittingAnswer(false);
      setError('The orchestrator is taking too long to respond. Please try submitting again or refresh the page.');
    }, 90000);
  }, [pollForUpdates, stopPolling]);

  useEffect(() => {
    if (state?.currentQuestion) {
      currentQuestionRef.current = state.currentQuestion.question;
    }
  }, [state]);

  useEffect(() => {
    loadState();
    return () => stopPolling();
  }, [loadState, stopPolling]);

  useEffect(() => {
    if (state && state.isStarted && !state.isComplete && !state.currentQuestion && !isWaitingForResponse) {
      startPolling();
    }
  }, [state, isWaitingForResponse, startPolling]);

  const startPlanning = async () => {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/planning`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setState(prev => ({
          ...prev!,
          sessionKey: data.sessionKey,
          messages: data.messages || [],
          isStarted: true,
        }));
        startPolling();
      } else {
        setError(data.error || 'Failed to start planning');
      }
    } catch (err) {
      setError('Failed to start planning');
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedOption) return;

    setSubmitting(true);
    setIsSubmittingAnswer(true);
    setError(null);

    const submission = {
      answer: selectedOption?.toLowerCase() === 'other' ? 'other' : selectedOption,
      otherText: selectedOption?.toLowerCase() === 'other' ? otherText : undefined,
    };
    lastSubmissionRef.current = submission;

    try {
      const res = await fetch(`/api/tasks/${taskId}/planning/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      const data = await res.json();

      if (res.ok) {
        startPolling();
      } else {
        setError(data.error || 'Failed to submit answer');
        setIsSubmittingAnswer(false);
        setSelectedOption(null);
        setOtherText('');
      }
    } catch (err) {
      setError('Failed to submit answer');
      setIsSubmittingAnswer(false);
      setSelectedOption(null);
      setOtherText('');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel planning and reset the task to inbox?')) return;

    setCanceling(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inbox' }),
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      setError('Failed to cancel planning');
    } finally {
      setCanceling(false);
    }
  };

  const retryDispatch = async () => {
    setRetryingDispatch(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/planning/retry-dispatch`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        window.location.reload();
      } else {
        setError(data.error || 'Retry failed');
      }
    } catch (err) {
      setError('Failed to retry dispatch');
    } finally {
      setRetryingDispatch(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary" sx={{ ml: 2 }}>
          Loading planning state...
        </Typography>
      </Box>
    );
  }

  if (!state) {
    return (
      <Alert severity="error">Failed to load planning state</Alert>
    );
  }

  // Not started yet
  if (!state.isStarted) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>📋</Typography>
        <Typography variant="h6" gutterBottom>Start Planning</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Answer a few questions to define the scope and requirements for this task.
        </Typography>
        <Button
          variant="contained"
          onClick={startPlanning}
          disabled={starting}
          startIcon={starting && <CircularProgress size={16} color="inherit" />}
        >
          {starting ? 'Starting...' : 'Start Planning Session'}
        </Button>
      </Box>
    );
  }

  // Planning complete
  if (state.isComplete && state.spec) {
    return (
      <Box>
        <Alert severity="success" icon={<LockIcon />} sx={{ mb: 3 }}>
          Planning complete! Specification has been locked.
        </Alert>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>{state.spec.title}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>{state.spec.summary}</Typography>

            {state.spec.deliverables.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>Deliverables:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {state.spec.deliverables.map((d, i) => (
                    <Chip key={i} label={d} size="small" />
                  ))}
                </Stack>
              </Box>
            )}

            {state.spec.success_criteria.length > 0 && (
              <Box>
                <Typography variant="body2" fontWeight="medium" gutterBottom>Success Criteria:</Typography>
                <Stack spacing={0.5}>
                  {state.spec.success_criteria.map((c, i) => (
                    <Typography key={i} variant="body2" color="text.secondary">• {c}</Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {state.agents && state.agents.length > 0 && (
          <Box>
            <Typography variant="body2" fontWeight="medium" gutterBottom>Assigned Agents:</Typography>
            <Stack spacing={1}>
              {state.agents.map((agent, i) => (
                <Card key={i}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="h5">{agent.avatar_emoji}</Typography>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">{agent.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{agent.role}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    );
  }

  // In progress
  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            state.dispatchError && (
              <Button
                color="inherit"
                size="small"
                onClick={retryDispatch}
                disabled={retryingDispatch}
              >
                {retryingDispatch ? 'Retrying...' : 'Retry'}
              </Button>
            )
          }
        >
          {error}
        </Alert>
      )}

      {/* Conversation history */}
      {state.messages.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {state.messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                mb: 1,
                p: 1.5,
                borderRadius: 1,
                bgcolor: msg.role === 'user' ? `${mcColors.accent}10` : 'background.default',
                borderLeft: 2,
                borderColor: msg.role === 'user' ? 'primary.main' : mcColors.accentPurple,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {msg.role === 'user' ? 'You' : '🧠 Orchestrator'}
              </Typography>
              <Typography variant="body2">{msg.content}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Current question */}
      {state.currentQuestion && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
              {state.currentQuestion.question}
            </Typography>

            <RadioGroup
              value={selectedOption || ''}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {state.currentQuestion.options.map((option) => (
                <FormControlLabel
                  key={option.id}
                  value={option.id}
                  control={<Radio />}
                  label={option.label}
                  disabled={isSubmittingAnswer}
                />
              ))}
            </RadioGroup>

            {selectedOption?.toLowerCase() === 'other' && (
              <TextField
                fullWidth
                multiline
                rows={2}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Please specify..."
                sx={{ mt: 2 }}
                disabled={isSubmittingAnswer}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Waiting state */}
      {isWaitingForResponse && !state.currentQuestion && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary" sx={{ ml: 2 }}>
            Waiting for response from orchestrator...
          </Typography>
        </Box>
      )}

      {/* Actions */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          onClick={handleCancel}
          disabled={canceling}
          color="error"
          startIcon={<CloseIcon />}
        >
          {canceling ? 'Canceling...' : 'Cancel Planning'}
        </Button>
        {state.currentQuestion && (
          <Button
            variant="contained"
            onClick={submitAnswer}
            disabled={!selectedOption || submitting || isSubmittingAnswer}
            startIcon={submitting && <CircularProgress size={16} color="inherit" />}
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
