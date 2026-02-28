import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Send, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AdvisorInvocationContext {
  sourcePath: string;
  sourceScreen: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

interface AdvisorChatPanelProps {
  invocationContext?: AdvisorInvocationContext | null;
  className?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ops-advisor`;

export function AdvisorChatPanel({ invocationContext, className }: AdvisorChatPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });
      if (data) setSessions(data as ChatSession[]);
      setLoadingSessions(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', activeSessionId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as ChatMessage[]);
    })();
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createSession = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select()
      .single();
    if (data) {
      const session = data as ChatSession;
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    }
    if (error) {
      toast({ title: 'Error', description: 'Could not create session', variant: 'destructive' });
    }
  };

  const deleteSession = async (id: string) => {
    await supabase.from('chat_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !user || isStreaming) return;

    let sessionId = activeSessionId;

    if (!sessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, title: input.slice(0, 60) })
        .select()
        .single();
      if (!data) return;
      const session = data as ChatSession;
      sessionId = session.id;
      setSessions(prev => [session, ...prev]);
      setActiveSessionId(sessionId);
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    streamingContentRef.current = '';

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: userMsg.content,
    });

    const currentMessages = messages;
    if (currentMessages.length === 0) {
      const title = userMsg.content.slice(0, 60);
      await supabase.from('chat_sessions').update({ title }).eq('id', sessionId);
      setSessions(prev => prev.map(s => (s.id === sessionId ? { ...s, title } : s)));
    }

    const aiMessages = [...currentMessages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    const assistantId = crypto.randomUUID();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: aiMessages,
          context: invocationContext || undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI error' }));
        toast({ title: 'AI Error', description: err.error || `Error ${resp.status}`, variant: 'destructive' });
        setIsStreaming(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setMessages(prev => [
        ...prev,
        {
          id: assistantId,
          session_id: sessionId!,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              streamingContentRef.current += content;
              const current = streamingContentRef.current;
              setMessages(prev =>
                prev.map(m => (m.id === assistantId ? { ...m, content: current } : m)),
              );
            }
          } catch {
            buffer = `${line}\n${buffer}`;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              streamingContentRef.current += content;
              const current = streamingContentRef.current;
              setMessages(prev =>
                prev.map(m => (m.id === assistantId ? { ...m, content: current } : m)),
              );
            }
          } catch {
            // Ignore malformed final buffer fragments.
          }
        }
      }

      if (streamingContentRef.current) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          user_id: user.id,
          role: 'assistant',
          content: streamingContentRef.current,
        });
      }
    } catch (e) {
      console.error('Stream error:', e);
      toast({ title: 'Error', description: 'Failed to get response', variant: 'destructive' });
    }

    setIsStreaming(false);
  }, [input, user, isStreaming, activeSessionId, messages, toast, invocationContext]);

  return (
    <div className={cn('flex h-full', className)}>
      <div className="w-64 border-r border-border flex flex-col bg-sidebar/50">
        <div className="p-3 border-b border-border">
          <Button onClick={createSession} variant="outline" size="sm" className="w-full gap-2">
            <Plus size={14} /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingSessions ? (
              <p className="text-xs text-muted-foreground p-2 font-mono">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2 font-mono">No sessions yet</p>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  className={cn(
                    'group flex items-center gap-2 px-2.5 py-2 rounded text-sm cursor-pointer transition-colors',
                    s.id === activeSessionId
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                  onClick={() => setActiveSessionId(s.id)}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate flex-1">{s.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {!activeSessionId && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <MessageSquare size={40} className="mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Ops Advisor</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Ask anything about your operations. The advisor can use your system data to provide actionable guidance.
              </p>
              {invocationContext && (
                <p className="text-[11px] font-mono text-primary mb-4">
                  Context: {invocationContext.sourceScreen}
                  {invocationContext.sourceEntityId ? ` · ${invocationContext.sourceEntityId}` : ''}
                </p>
              )}
              <Button onClick={createSession} variant="outline" className="gap-2">
                <Plus size={14} /> Start a conversation
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-4 py-3 text-sm',
                        m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{m.content || '...'}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border p-4">
              <form
                className="max-w-3xl mx-auto flex gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask your advisor..."
                  disabled={isStreaming}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={isStreaming || !input.trim()} size="icon">
                  {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2 font-mono">
                Sensitive secrets are excluded. Your data is not used for model training.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
