import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Program, Workstream, Milestone, WorkItem } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProgramStoreContextType {
  programs: Program[];
  workstreams: Workstream[];
  milestones: Milestone[];
  workItems: WorkItem[];
  loading: boolean;
  addProgram: (p: Omit<Program, 'id' | 'createdAt'>) => Promise<void>;
  updateProgram: (p: Program) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  addWorkstream: (w: Omit<Workstream, 'id'>) => Promise<void>;
  updateWorkstream: (w: Workstream) => Promise<void>;
  deleteWorkstream: (id: string) => Promise<void>;
  addMilestone: (m: Omit<Milestone, 'id'>) => Promise<void>;
  updateMilestone: (m: Milestone) => Promise<void>;
  toggleMilestoneComplete: (id: string) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  addWorkItem: (w: Omit<WorkItem, 'id'>) => Promise<void>;
  updateWorkItem: (w: WorkItem) => Promise<void>;
  deleteWorkItem: (id: string) => Promise<void>;
  getWorkstreamsForProgram: (programId: string) => Workstream[];
  getMilestonesForProject: (projectId: string) => Milestone[];
  getWorkItemsForMilestone: (milestoneId: string) => WorkItem[];
  getChildWorkItems: (parentId: string) => WorkItem[];
  getRootWorkItems: (projectId: string, milestoneId?: string | null) => WorkItem[];
}

const ProgramStoreContext = createContext<ProgramStoreContextType | null>(null);

export function ProgramStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setPrograms([]); setWorkstreams([]); setMilestones([]); setWorkItems([]); setLoading(false); return; }
    setLoading(true);
    const fetchAll = async () => {
      const [{ data: pg }, { data: ws }, { data: ms }, { data: wi }] = await Promise.all([
        supabase.from('programs').select('*').is('deleted_at', null).order('created_at'),
        supabase.from('workstreams').select('*').is('deleted_at', null).order('sort_order'),
        supabase.from('milestones').select('*').order('sort_order'),
        supabase.from('work_items').select('*').order('sort_order'),
      ]);
      setPrograms((pg || []).map((r: any) => ({
        id: r.id, name: r.name, description: r.description,
        startDate: r.start_date, targetEndDate: r.target_end_date,
        status: r.status, createdAt: r.created_at,
        externalRef: r.external_ref || null,
      })));
      setWorkstreams((ws || []).map((r: any) => ({
        id: r.id, programId: r.program_id, name: r.name,
        description: r.description, sortOrder: r.sort_order,
        externalRef: r.external_ref || null, leadId: r.lead_id || null,
      })));
      setMilestones((ms || []).map((r: any) => ({
        id: r.id, projectId: r.project_id, name: r.name,
        targetDate: r.target_date, completed: r.completed,
        completedDate: r.completed_date, sortOrder: r.sort_order,
      })));
      setWorkItems((wi || []).map((r: any) => ({
        id: r.id, milestoneId: r.milestone_id, projectId: r.project_id,
        parentId: r.parent_id, type: r.type, title: r.title,
        description: r.description, status: r.status,
        assigneeId: r.assignee_id, dueDate: r.due_date, sortOrder: r.sort_order,
      })));
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const addProgram = useCallback(async (p: Omit<Program, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data } = await supabase.from('programs').insert({
      user_id: user.id, name: p.name, description: p.description,
      start_date: p.startDate, target_end_date: p.targetEndDate, status: p.status,
      external_ref: p.externalRef || null,
    }).select().single();
    if (data) setPrograms(prev => [...prev, {
      id: data.id, name: data.name, description: data.description,
      startDate: data.start_date, targetEndDate: data.target_end_date,
      status: data.status as Program['status'], createdAt: data.created_at,
      externalRef: (data as any).external_ref || null,
    }]);
  }, [user]);

  const updateProgram = useCallback(async (p: Program) => {
    await supabase.from('programs').update({
      name: p.name, description: p.description, start_date: p.startDate,
      target_end_date: p.targetEndDate, status: p.status,
      external_ref: p.externalRef || null,
    }).eq('id', p.id);
    setPrograms(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);

  const deleteProgram = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    // Soft-delete program and its workstreams
    await supabase.from('workstreams').update({ deleted_at: now }).eq('program_id', id);
    await supabase.from('programs').update({ deleted_at: now }).eq('id', id);
    setWorkstreams(prev => prev.filter(x => x.programId !== id));
    setPrograms(prev => prev.filter(x => x.id !== id));
  }, []);

  const addWorkstream = useCallback(async (w: Omit<Workstream, 'id'>) => {
    if (!user) return;
    const { data } = await supabase.from('workstreams').insert({
      user_id: user.id, program_id: w.programId, name: w.name,
      description: w.description, sort_order: w.sortOrder,
      external_ref: w.externalRef || null, lead_id: w.leadId || null,
    }).select().single();
    if (data) setWorkstreams(prev => [...prev, {
      id: data.id, programId: data.program_id, name: data.name,
      description: data.description, sortOrder: data.sort_order,
      externalRef: (data as any).external_ref || null, leadId: (data as any).lead_id || null,
    }]);
  }, [user]);

  const updateWorkstream = useCallback(async (w: Workstream) => {
    await supabase.from('workstreams').update({
      name: w.name, description: w.description, sort_order: w.sortOrder,
      external_ref: w.externalRef || null, lead_id: w.leadId || null,
    }).eq('id', w.id);
    setWorkstreams(prev => prev.map(x => x.id === w.id ? w : x));
  }, []);

  const deleteWorkstream = useCallback(async (id: string) => {
    await supabase.from('workstreams').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setWorkstreams(prev => prev.filter(x => x.id !== id));
  }, []);

  const addMilestone = useCallback(async (m: Omit<Milestone, 'id'>) => {
    if (!user) return;
    const { data } = await supabase.from('milestones').insert({
      user_id: user.id, project_id: m.projectId, name: m.name,
      target_date: m.targetDate, completed: m.completed,
      completed_date: m.completedDate, sort_order: m.sortOrder,
    }).select().single();
    if (data) setMilestones(prev => [...prev, {
      id: data.id, projectId: data.project_id, name: data.name,
      targetDate: data.target_date, completed: data.completed,
      completedDate: data.completed_date, sortOrder: data.sort_order,
    }]);
  }, [user]);

  const updateMilestone = useCallback(async (m: Milestone) => {
    await supabase.from('milestones').update({
      name: m.name, target_date: m.targetDate, completed: m.completed,
      completed_date: m.completedDate, sort_order: m.sortOrder,
    }).eq('id', m.id);
    setMilestones(prev => prev.map(x => x.id === m.id ? m : x));
  }, []);

  const toggleMilestoneComplete = useCallback(async (id: string) => {
    setMilestones(prev => {
      const m = prev.find(x => x.id === id);
      if (!m) return prev;
      const updated = { ...m, completed: !m.completed, completedDate: !m.completed ? new Date().toISOString().split('T')[0] : null };
      supabase.from('milestones').update({
        completed: updated.completed, completed_date: updated.completedDate,
      }).eq('id', id).then();
      return prev.map(x => x.id === id ? updated : x);
    });
  }, []);

  const deleteMilestone = useCallback(async (id: string) => {
    await supabase.from('milestones').delete().eq('id', id);
    setMilestones(prev => prev.filter(x => x.id !== id));
  }, []);

  const addWorkItem = useCallback(async (w: Omit<WorkItem, 'id'>) => {
    if (!user) return;
    const { data } = await supabase.from('work_items').insert({
      user_id: user.id, milestone_id: w.milestoneId, project_id: w.projectId,
      parent_id: w.parentId, type: w.type, title: w.title,
      description: w.description, status: w.status,
      assignee_id: w.assigneeId, due_date: w.dueDate, sort_order: w.sortOrder,
    }).select().single();
    if (data) setWorkItems(prev => [...prev, {
      id: data.id, milestoneId: data.milestone_id, projectId: data.project_id,
      parentId: data.parent_id, type: data.type as WorkItem['type'], title: data.title,
      description: data.description, status: data.status as WorkItem['status'],
      assigneeId: data.assignee_id, dueDate: data.due_date, sortOrder: data.sort_order,
    }]);
  }, [user]);

  const updateWorkItem = useCallback(async (w: WorkItem) => {
    await supabase.from('work_items').update({
      title: w.title, description: w.description, status: w.status,
      assignee_id: w.assigneeId, due_date: w.dueDate, sort_order: w.sortOrder,
      milestone_id: w.milestoneId, parent_id: w.parentId,
    }).eq('id', w.id);
    setWorkItems(prev => prev.map(x => x.id === w.id ? w : x));
  }, []);

  const deleteWorkItem = useCallback(async (id: string) => {
    await supabase.from('work_items').delete().eq('id', id);
    setWorkItems(prev => prev.filter(x => x.id !== id && x.parentId !== id));
  }, []);

  const getWorkstreamsForProgram = useCallback((programId: string) =>
    workstreams.filter(w => w.programId === programId), [workstreams]);
  const getMilestonesForProject = useCallback((projectId: string) =>
    milestones.filter(m => m.projectId === projectId), [milestones]);
  const getWorkItemsForMilestone = useCallback((milestoneId: string) =>
    workItems.filter(w => w.milestoneId === milestoneId && !w.parentId), [workItems]);
  const getChildWorkItems = useCallback((parentId: string) =>
    workItems.filter(w => w.parentId === parentId), [workItems]);
  const getRootWorkItems = useCallback((projectId: string, milestoneId?: string | null) =>
    workItems.filter(w => w.projectId === projectId && w.milestoneId === (milestoneId || null) && !w.parentId), [workItems]);

  const value = useMemo(() => ({
    programs, workstreams, milestones, workItems, loading,
    addProgram, updateProgram, deleteProgram,
    addWorkstream, updateWorkstream, deleteWorkstream,
    addMilestone, updateMilestone, toggleMilestoneComplete, deleteMilestone,
    addWorkItem, updateWorkItem, deleteWorkItem,
    getWorkstreamsForProgram, getMilestonesForProject,
    getWorkItemsForMilestone, getChildWorkItems, getRootWorkItems,
  }), [programs, workstreams, milestones, workItems, loading,
    addProgram, updateProgram, deleteProgram,
    addWorkstream, updateWorkstream, deleteWorkstream,
    addMilestone, updateMilestone, toggleMilestoneComplete, deleteMilestone,
    addWorkItem, updateWorkItem, deleteWorkItem,
    getWorkstreamsForProgram, getMilestonesForProject,
    getWorkItemsForMilestone, getChildWorkItems, getRootWorkItems]);

  return (
    <ProgramStoreContext.Provider value={value}>
      {children}
    </ProgramStoreContext.Provider>
  );
}

export function useProgramStore() {
  const ctx = useContext(ProgramStoreContext);
  if (!ctx) throw new Error('useProgramStore must be used within ProgramStoreProvider');
  return ctx;
}
