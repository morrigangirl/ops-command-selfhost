import { createContext, useContext, useState, useEffect, type ReactNode, useCallback, useMemo } from 'react';
import { Person, Project, ReviewEntry, DriftAlert, CADENCE_DAYS } from './types';
import { differenceInDays, addDays, parseISO, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const genId = () => crypto.randomUUID();

interface StoreContextType {
  people: Person[];
  projects: Project[];
  loading: boolean;
  addPerson: (p: Omit<Person, 'id'>) => Promise<void>;
  updatePerson: (p: Person) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  addProject: (p: Omit<Project, 'id' | 'createdDate' | 'reviewLog'>) => Promise<void>;
  updateProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addReviewEntry: (projectId: string, entry: Omit<ReviewEntry, 'id'>) => Promise<void>;
  getNextReview: (project: Project) => Date;
  getDriftAlerts: () => DriftAlert[];
  getPerson: (id: string) => Person | undefined;
  getProject: (id: string) => Project | undefined;
  getActiveProjectsForPerson: (personId: string) => Project[];
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviewEntries, setReviewEntries] = useState<Record<string, ReviewEntry[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch people
  useEffect(() => {
    if (!user) { setPeople([]); setProjects([]); setReviewEntries({}); setLoading(false); return; }
    setLoading(true);

    const fetchAll = async () => {
      const [{ data: pData }, { data: prData }, { data: reData }] = await Promise.all([
        supabase.from('people').select('*').order('created_at'),
        supabase.from('projects').select('*').is('deleted_at', null).order('created_at'),
        supabase.from('review_entries').select('*').order('created_at'),
      ]);

      setPeople((pData || []).map(r => ({
        id: r.id,
        name: r.name,
        role: r.role,
        active: r.active,
        managerId: r.manager_id,
        last1on1: r.last_1on1,
        lastStrategicDeepDive: r.last_strategic_deep_dive,
        lastHumanCheckin: r.last_human_checkin,
        default1on1CadenceDays: r.default_1on1_cadence_days,
        defaultStrategyCadenceDays: r.default_strategy_cadence_days,
        defaultCheckinCadenceDays: r.default_checkin_cadence_days,
      })));

      const entries: Record<string, ReviewEntry[]> = {};
      (reData || []).forEach(r => {
        if (!entries[r.project_id]) entries[r.project_id] = [];
        entries[r.project_id].push({ id: r.id, date: r.date, notes: r.notes });
      });
      setReviewEntries(entries);

      setProjects((prData || []).map(r => ({
        id: r.id,
        name: r.name,
        problemStatement: r.problem_statement,
        strategicGoal: r.strategic_goal,
        successMetric: r.success_metric,
        ownerId: r.owner_id || '',
        status: r.status as Project['status'],
        risk: r.risk as Project['risk'],
        reviewCadence: r.review_cadence as Project['reviewCadence'],
        targetDate: r.target_date,
        createdDate: r.created_date,
        lastReviewed: r.last_reviewed,
        reviewLog: entries[r.id] || [],
        refinedBrief: (r as any).refined_brief || null,
        workstreamId: (r as any).workstream_id || null,
        externalRef: (r as any).external_ref || null,
        riskStatement: (r as any).risk_statement || '',
        phase: (r as any).phase || null,
        tags: (r as any).tags || [],
      })));

      setLoading(false);
    };

    fetchAll();
  }, [user]);

  // Attach reviewLog to projects when entries change
  useEffect(() => {
    setProjects(prev => prev.map(p => ({ ...p, reviewLog: reviewEntries[p.id] || [] })));
  }, [reviewEntries]);

  const addPerson = useCallback(async (p: Omit<Person, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('people').insert({
      user_id: user.id,
      name: p.name,
      role: p.role,
      active: p.active,
      manager_id: p.managerId,
      last_1on1: p.last1on1,
      last_strategic_deep_dive: p.lastStrategicDeepDive,
      last_human_checkin: p.lastHumanCheckin,
      default_1on1_cadence_days: p.default1on1CadenceDays,
      default_strategy_cadence_days: p.defaultStrategyCadenceDays,
      default_checkin_cadence_days: p.defaultCheckinCadenceDays,
    }).select().single();
    if (data) {
      setPeople(prev => [...prev, {
        id: data.id, name: data.name, role: data.role, active: data.active,
        managerId: data.manager_id, last1on1: data.last_1on1,
        lastStrategicDeepDive: data.last_strategic_deep_dive, lastHumanCheckin: data.last_human_checkin,
        default1on1CadenceDays: data.default_1on1_cadence_days,
        defaultStrategyCadenceDays: data.default_strategy_cadence_days,
        defaultCheckinCadenceDays: data.default_checkin_cadence_days,
      }]);
    }
  }, [user]);

  const updatePerson = useCallback(async (p: Person) => {
    await supabase.from('people').update({
      name: p.name, role: p.role, active: p.active, manager_id: p.managerId,
      last_1on1: p.last1on1, last_strategic_deep_dive: p.lastStrategicDeepDive,
      last_human_checkin: p.lastHumanCheckin,
      default_1on1_cadence_days: p.default1on1CadenceDays,
      default_strategy_cadence_days: p.defaultStrategyCadenceDays,
      default_checkin_cadence_days: p.defaultCheckinCadenceDays,
    }).eq('id', p.id);
    setPeople(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);

  const deletePerson = useCallback(async (id: string) => {
    await supabase.from('people').delete().eq('id', id);
    setPeople(prev => prev.filter(x => x.id !== id));
  }, []);

  const addProject = useCallback(async (p: Omit<Project, 'id' | 'createdDate' | 'reviewLog'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('projects').insert({
      user_id: user.id,
      name: p.name,
      problem_statement: p.problemStatement,
      strategic_goal: p.strategicGoal,
      success_metric: p.successMetric,
      owner_id: p.ownerId || null,
      status: p.status,
      risk: p.risk,
      review_cadence: p.reviewCadence,
      target_date: p.targetDate,
      last_reviewed: p.lastReviewed,
      workstream_id: p.workstreamId || null,
      external_ref: p.externalRef || null,
      risk_statement: p.riskStatement || '',
      phase: p.phase || null,
      tags: p.tags || [],
    }).select().single();
    if (data) {
      setProjects(prev => [...prev, {
        id: data.id, name: data.name, problemStatement: data.problem_statement,
        strategicGoal: data.strategic_goal, successMetric: data.success_metric,
        ownerId: data.owner_id || '', status: data.status as Project['status'],
        risk: data.risk as Project['risk'], reviewCadence: data.review_cadence as Project['reviewCadence'],
        targetDate: data.target_date, createdDate: data.created_date,
        lastReviewed: data.last_reviewed, reviewLog: [],
        refinedBrief: (data as any).refined_brief || null,
        workstreamId: (data as any).workstream_id || null,
        externalRef: (data as any).external_ref || null,
        riskStatement: (data as any).risk_statement || '',
        phase: (data as any).phase || null,
        tags: (data as any).tags || [],
      }]);
    }
  }, [user]);

  const updateProject = useCallback(async (p: Project) => {
    const { error } = await supabase.from('projects').update({
      name: p.name, problem_statement: p.problemStatement, strategic_goal: p.strategicGoal,
      success_metric: p.successMetric, owner_id: p.ownerId || null, status: p.status,
      risk: p.risk, review_cadence: p.reviewCadence, target_date: p.targetDate,
      last_reviewed: p.lastReviewed, refined_brief: p.refinedBrief,
      workstream_id: p.workstreamId || null,
      external_ref: p.externalRef || null,
      risk_statement: p.riskStatement || '',
      phase: p.phase || null,
      tags: p.tags || [],
    }).eq('id', p.id);
    if (error) {
      console.error('updateProject error:', error);
      throw error;
    }
    setProjects(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setProjects(prev => prev.filter(x => x.id !== id));
  }, []);

  const addReviewEntry = useCallback(async (projectId: string, entry: Omit<ReviewEntry, 'id'>) => {
    if (!user) return;
    const { data } = await supabase.from('review_entries').insert({
      user_id: user.id,
      project_id: projectId,
      date: entry.date,
      notes: entry.notes,
    }).select().single();

    // Update last_reviewed on the project
    await supabase.from('projects').update({ last_reviewed: entry.date }).eq('id', projectId);

    if (data) {
      const newEntry: ReviewEntry = { id: data.id, date: data.date, notes: data.notes };
      setReviewEntries(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), newEntry],
      }));
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return { ...p, lastReviewed: entry.date, reviewLog: [...p.reviewLog, newEntry] };
      }));
    }
  }, [user]);

  const getNextReview = useCallback((project: Project): Date => {
    const baseDate = project.lastReviewed || project.createdDate;
    return addDays(parseISO(baseDate), CADENCE_DAYS[project.reviewCadence]);
  }, []);

  const getDriftAlerts = useCallback((): DriftAlert[] => {
    const alerts: DriftAlert[] = [];
    const today = new Date();

    projects.forEach(p => {
      const next = getNextReview(p);
      if (today > next) {
        const days = differenceInDays(today, next);
        alerts.push({
          id: `drift-review-${p.id}`, type: 'review-overdue',
          message: `"${p.name}" is ${days}d overdue for review`,
          severity: days > 14 ? 'critical' : 'warning', entityId: p.id, entityType: 'project',
        });
      }
    });

    people.filter(p => p.active).forEach(person => {
      if (person.lastStrategicDeepDive) {
        const days = differenceInDays(today, parseISO(person.lastStrategicDeepDive));
        if (days > person.defaultStrategyCadenceDays) {
          alerts.push({
            id: `drift-strategy-${person.id}`, type: 'strategy-gap',
            message: `${person.name}: ${days}d since strategic deep dive (cadence: ${person.defaultStrategyCadenceDays}d)`,
            severity: days > person.defaultStrategyCadenceDays * 1.5 ? 'critical' : 'warning', entityId: person.id, entityType: 'person',
          });
        }
      }
      if (person.lastHumanCheckin) {
        const days = differenceInDays(today, parseISO(person.lastHumanCheckin));
        if (days > person.defaultCheckinCadenceDays) {
          alerts.push({
            id: `drift-checkin-${person.id}`, type: 'checkin-gap',
            message: `${person.name}: ${days}d since human check-in (cadence: ${person.defaultCheckinCadenceDays}d)`,
            severity: days > person.defaultCheckinCadenceDays * 1.5 ? 'critical' : 'warning', entityId: person.id, entityType: 'person',
          });
        }
      }
    });

    return alerts;
  }, [people, projects, getNextReview]);

  const getPerson = useCallback((id: string) => people.find(p => p.id === id), [people]);
  const getProject = useCallback((id: string) => projects.find(p => p.id === id), [projects]);
  const getActiveProjectsForPerson = useCallback((personId: string) =>
    projects.filter(p => p.ownerId === personId), [projects]);

  const value = useMemo(() => ({
    people, projects, loading, addPerson, updatePerson, deletePerson, addProject, updateProject, deleteProject,
    addReviewEntry, getNextReview, getDriftAlerts, getPerson, getProject,
    getActiveProjectsForPerson,
  }), [people, projects, loading, addPerson, updatePerson, deletePerson, addProject, updateProject, deleteProject,
    addReviewEntry, getNextReview, getDriftAlerts, getPerson, getProject,
    getActiveProjectsForPerson]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function wouldCreateCycle(personId: string, managerId: string | null, people: Person[]): boolean {
  if (!managerId) return false;
  let current: string | null = managerId;
  const visited = new Set<string>();
  while (current) {
    if (current === personId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const person = people.find(p => p.id === current);
    current = person?.managerId || null;
  }
  return false;
}
