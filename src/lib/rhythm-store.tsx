import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useMemo } from 'react';
import { Meeting, MeetingActionItem, MeetingDecision, EscalationFlag, MeetingType } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from './store';
import { format } from 'date-fns';

interface RhythmStoreContextType {
  meetings: Meeting[];
  actionItems: MeetingActionItem[];
  decisions: MeetingDecision[];
  loading: boolean;
  addMeeting: (m: Omit<Meeting, 'id'>) => Promise<Meeting | null>;
  updateMeeting: (m: Meeting) => Promise<void>;
  completeMeeting: (meetingId: string) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  addActionItem: (a: Omit<MeetingActionItem, 'id'>) => Promise<void>;
  updateActionItem: (a: MeetingActionItem) => Promise<void>;
  deleteActionItem: (id: string) => Promise<void>;
  addDecision: (d: Omit<MeetingDecision, 'id'>) => Promise<void>;
  deleteDecision: (id: string) => Promise<void>;
  getMeetingsForPerson: (personId: string) => Meeting[];
  getActionItemsForMeeting: (meetingId: string) => MeetingActionItem[];
  getDecisionsForMeeting: (meetingId: string) => MeetingDecision[];
  getOpenActionItemsForPerson: (personId: string) => MeetingActionItem[];
  getEscalationFlags: () => EscalationFlag[];
  getUpcomingMeetings: () => Meeting[];
  generateAgenda: (personId: string, type: MeetingType) => Promise<string>;
}

const RhythmStoreContext = createContext<RhythmStoreContextType | null>(null);

function mapMeeting(r: any): Meeting {
  return {
    id: r.id, personId: r.person_id, type: r.type as MeetingType,
    scheduledDate: r.scheduled_date, status: r.status,
    agenda: r.agenda, notes: r.notes, completedAt: r.completed_at,
  };
}

function mapActionItem(r: any): MeetingActionItem {
  return {
    id: r.id, meetingId: r.meeting_id, title: r.title,
    ownerId: r.owner_id, dueDate: r.due_date,
    projectId: r.project_id, status: r.status,
  };
}

function mapDecision(r: any): MeetingDecision {
  return { id: r.id, meetingId: r.meeting_id, summary: r.summary };
}

export function RhythmStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { people, updatePerson, projects } = useStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setMeetings([]); setActionItems([]); setDecisions([]); setLoading(false); return; }
    setLoading(true);
    const fetchAll = async () => {
      const [{ data: mData }, { data: aData }, { data: dData }] = await Promise.all([
        (supabase.from('meetings' as any) as any).select('*').order('scheduled_date', { ascending: false }),
        (supabase.from('meeting_action_items' as any) as any).select('*').order('created_at'),
        (supabase.from('meeting_decisions' as any) as any).select('*').order('created_at'),
      ]);
      setMeetings((mData || []).map(mapMeeting));
      setActionItems((aData || []).map(mapActionItem));
      setDecisions((dData || []).map(mapDecision));
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const addMeeting = useCallback(async (m: Omit<Meeting, 'id'>): Promise<Meeting | null> => {
    if (!user) return null;
    const { data } = await (supabase.from('meetings' as any) as any).insert({
      user_id: user.id, person_id: m.personId, type: m.type,
      scheduled_date: m.scheduledDate, status: m.status,
      agenda: m.agenda, notes: m.notes, completed_at: m.completedAt,
    }).select().single();
    if (data) {
      const meeting = mapMeeting(data);
      setMeetings(prev => [meeting, ...prev]);
      return meeting;
    }
    return null;
  }, [user]);

  const updateMeeting = useCallback(async (m: Meeting) => {
    await (supabase.from('meetings' as any) as any).update({
      type: m.type, scheduled_date: m.scheduledDate, status: m.status,
      agenda: m.agenda, notes: m.notes, completed_at: m.completedAt,
    }).eq('id', m.id);
    setMeetings(prev => prev.map(x => x.id === m.id ? m : x));
  }, []);

  const completeMeeting = useCallback(async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const now = new Date().toISOString();
    const today = format(new Date(), 'yyyy-MM-dd');

    await (supabase.from('meetings' as any) as any).update({
      status: 'completed', completed_at: now,
    }).eq('id', meetingId);

    setMeetings(prev => prev.map(x => x.id === meetingId ? { ...x, status: 'completed' as const, completedAt: now } : x));

    // Update person's last date based on meeting type
    const person = people.find(p => p.id === meeting.personId);
    if (person) {
      const updates: any = {};
      if (meeting.type === '1on1') updates.last1on1 = today;
      else if (meeting.type === 'strategy') updates.lastStrategicDeepDive = today;
      else if (meeting.type === 'checkin') updates.lastHumanCheckin = today;
      updatePerson({ ...person, ...updates });
    }
  }, [meetings, people, updatePerson]);

  const deleteMeeting = useCallback(async (id: string) => {
    await (supabase.from('meetings' as any) as any).delete().eq('id', id);
    setMeetings(prev => prev.filter(x => x.id !== id));
    setActionItems(prev => prev.filter(x => x.meetingId !== id));
    setDecisions(prev => prev.filter(x => x.meetingId !== id));
  }, []);

  const addActionItem = useCallback(async (a: Omit<MeetingActionItem, 'id'>) => {
    if (!user) return;
    const { data } = await (supabase.from('meeting_action_items' as any) as any).insert({
      user_id: user.id, meeting_id: a.meetingId, title: a.title,
      owner_id: a.ownerId, due_date: a.dueDate, project_id: a.projectId, status: a.status,
    }).select().single();
    if (data) setActionItems(prev => [...prev, mapActionItem(data)]);
  }, [user]);

  const updateActionItem = useCallback(async (a: MeetingActionItem) => {
    await (supabase.from('meeting_action_items' as any) as any).update({
      title: a.title, owner_id: a.ownerId, due_date: a.dueDate,
      project_id: a.projectId, status: a.status,
    }).eq('id', a.id);
    setActionItems(prev => prev.map(x => x.id === a.id ? a : x));
  }, []);

  const deleteActionItem = useCallback(async (id: string) => {
    await (supabase.from('meeting_action_items' as any) as any).delete().eq('id', id);
    setActionItems(prev => prev.filter(x => x.id !== id));
  }, []);

  const addDecision = useCallback(async (d: Omit<MeetingDecision, 'id'>) => {
    if (!user) return;
    const { data } = await (supabase.from('meeting_decisions' as any) as any).insert({
      user_id: user.id, meeting_id: d.meetingId, summary: d.summary,
    }).select().single();
    if (data) setDecisions(prev => [...prev, mapDecision(data)]);
  }, [user]);

  const deleteDecision = useCallback(async (id: string) => {
    await (supabase.from('meeting_decisions' as any) as any).delete().eq('id', id);
    setDecisions(prev => prev.filter(x => x.id !== id));
  }, []);

  const getMeetingsForPerson = useCallback((personId: string) =>
    meetings.filter(m => m.personId === personId).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    [meetings]);

  const getActionItemsForMeeting = useCallback((meetingId: string) =>
    actionItems.filter(a => a.meetingId === meetingId), [actionItems]);

  const getDecisionsForMeeting = useCallback((meetingId: string) =>
    decisions.filter(d => d.meetingId === meetingId), [decisions]);

  const getOpenActionItemsForPerson = useCallback((personId: string) => {
    const personMeetingIds = new Set(meetings.filter(m => m.personId === personId).map(m => m.id));
    return actionItems.filter(a => personMeetingIds.has(a.meetingId) && a.status !== 'done');
  }, [meetings, actionItems]);

  const getEscalationFlags = useCallback((): EscalationFlag[] => {
    // Group blocked items by owner
    const blocked = actionItems.filter(a => a.status === 'blocked');
    const byOwner = new Map<string, MeetingActionItem[]>();
    blocked.forEach(a => {
      const key = a.ownerId || 'unassigned';
      if (!byOwner.has(key)) byOwner.set(key, []);
      byOwner.get(key)!.push(a);
    });

    const flags: EscalationFlag[] = [];
    byOwner.forEach((items, ownerId) => {
      // Group by title (case-insensitive)
      const byTitle = new Map<string, MeetingActionItem[]>();
      items.forEach(item => {
        const key = item.title.toLowerCase().trim();
        if (!byTitle.has(key)) byTitle.set(key, []);
        byTitle.get(key)!.push(item);
      });

      byTitle.forEach((titleItems, _) => {
        // Check if blocked across 2+ different meetings
        const uniqueMeetings = [...new Set(titleItems.map(i => i.meetingId))];
        if (uniqueMeetings.length >= 2) {
          const person = people.find(p => p.id === ownerId);
          flags.push({
            personId: ownerId,
            personName: person?.name || 'Unassigned',
            blockedItemTitle: titleItems[0].title,
            occurrences: uniqueMeetings.length,
            meetingIds: uniqueMeetings,
          });
        }
      });
    });

    return flags;
  }, [actionItems, people]);

  const getUpcomingMeetings = useCallback(() =>
    meetings.filter(m => m.status === 'scheduled').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    [meetings]);

  const generateAgenda = useCallback(async (personId: string, type: MeetingType): Promise<string> => {
    const person = people.find(p => p.id === personId);
    const personMeetings = meetings.filter(m => m.personId === personId && m.status === 'completed')
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    const lastMeeting = personMeetings[0];
    const openItems = getOpenActionItemsForPerson(personId);
    const activeProjects = projects.filter(p => p.ownerId === personId);

    const { data, error } = await supabase.functions.invoke('generate-agenda', {
      body: {
        personName: person?.name || 'Unknown',
        meetingType: type,
        lastMeetingNotes: lastMeeting?.notes || '',
        openActionItems: openItems.map(a => a.title),
        activeProjects: activeProjects.map(p => p.name),
      },
    });

    if (error) throw error;
    return data?.agenda || '';
  }, [people, meetings, getOpenActionItemsForPerson, projects]);

  const value = useMemo(() => ({
    meetings, actionItems, decisions, loading,
    addMeeting, updateMeeting, completeMeeting, deleteMeeting,
    addActionItem, updateActionItem, deleteActionItem,
    addDecision, deleteDecision,
    getMeetingsForPerson, getActionItemsForMeeting, getDecisionsForMeeting,
    getOpenActionItemsForPerson, getEscalationFlags, getUpcomingMeetings, generateAgenda,
  }), [meetings, actionItems, decisions, loading,
    addMeeting, updateMeeting, completeMeeting, deleteMeeting,
    addActionItem, updateActionItem, deleteActionItem,
    addDecision, deleteDecision,
    getMeetingsForPerson, getActionItemsForMeeting, getDecisionsForMeeting,
    getOpenActionItemsForPerson, getEscalationFlags, getUpcomingMeetings, generateAgenda]);

  return (
    <RhythmStoreContext.Provider value={value}>
      {children}
    </RhythmStoreContext.Provider>
  );
}

export function useRhythmStore() {
  const ctx = useContext(RhythmStoreContext);
  if (!ctx) {
    throw new Error('useRhythmStore must be used within RhythmStoreProvider');
  }
  return ctx;
}
