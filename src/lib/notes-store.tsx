import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { type Note, type NoteTargetType } from './types';

type NoteScopeFilter = 'all' | 'orphan' | 'attached';

interface NoteSearchFilters {
  scope?: NoteScopeFilter;
  targetType?: NoteTargetType | 'all';
}

interface NoteInput {
  title: string;
  body: string;
  targetType: NoteTargetType | null;
  targetId: string | null;
  isPinned: boolean;
}

interface NotesStoreContextType {
  notes: Note[];
  loading: boolean;
  addNote: (input: NoteInput) => Promise<void>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNotesForTarget: (targetType: NoteTargetType, targetId: string) => Note[];
  getOrphanNotes: () => Note[];
  searchNotes: (query: string, filters?: NoteSearchFilters) => Note[];
  refreshNotes: () => Promise<void>;
}

const NotesStoreContext = createContext<NotesStoreContextType | null>(null);

function mapNoteRow(row: any): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    targetType: row.target_type,
    targetId: row.target_id,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sortNotes(a: Note, b: Note): number {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export function NotesStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase.from('notes' as any) as any)
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('notes fetch error:', error);
      setLoading(false);
      throw error;
    }

    setNotes((data || []).map(mapNoteRow));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshNotes().catch((error) => {
      console.error('refreshNotes failed:', error);
    });
  }, [refreshNotes]);

  const addNote = useCallback(async (input: NoteInput) => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      title: input.title,
      body: input.body,
      target_type: input.targetType,
      target_id: input.targetId,
      is_pinned: input.isPinned,
    };

    const { data, error } = await (supabase.from('notes' as any) as any)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('addNote error:', error);
      throw error;
    }

    if (data) {
      const note = mapNoteRow(data);
      setNotes((prev) => [...prev, note].sort(sortNotes));
    }
  }, [user]);

  const updateNote = useCallback(async (note: Note) => {
    const { data, error } = await (supabase.from('notes' as any) as any)
      .update({
        title: note.title,
        body: note.body,
        target_type: note.targetType,
        target_id: note.targetId,
        is_pinned: note.isPinned,
      })
      .eq('id', note.id)
      .select('*')
      .single();

    if (error) {
      console.error('updateNote error:', error);
      throw error;
    }

    if (data) {
      const updated = mapNoteRow(data);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)).sort(sortNotes));
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await (supabase.from('notes' as any) as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteNote error:', error);
      throw error;
    }

    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getNotesForTarget = useCallback((targetType: NoteTargetType, targetId: string) => {
    return notes
      .filter((n) => n.targetType === targetType && n.targetId === targetId)
      .sort(sortNotes);
  }, [notes]);

  const getOrphanNotes = useCallback(() => {
    return notes
      .filter((n) => n.targetType === null && n.targetId === null)
      .sort(sortNotes);
  }, [notes]);

  const searchNotes = useCallback((query: string, filters: NoteSearchFilters = {}) => {
    const needle = query.trim().toLowerCase();
    const scope = filters.scope || 'all';

    return notes
      .filter((note) => {
        if (scope === 'orphan' && note.targetType !== null) return false;
        if (scope === 'attached' && note.targetType === null) return false;
        if (filters.targetType && filters.targetType !== 'all' && note.targetType !== filters.targetType) return false;

        if (!needle) return true;

        const title = note.title.toLowerCase();
        const body = note.body.toLowerCase();
        return title.includes(needle) || body.includes(needle);
      })
      .sort(sortNotes);
  }, [notes]);

  const value = useMemo(() => ({
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    getNotesForTarget,
    getOrphanNotes,
    searchNotes,
    refreshNotes,
  }), [notes, loading, addNote, updateNote, deleteNote, getNotesForTarget, getOrphanNotes, searchNotes, refreshNotes]);

  return (
    <NotesStoreContext.Provider value={value}>
      {children}
    </NotesStoreContext.Provider>
  );
}

export function useNotesStore() {
  const ctx = useContext(NotesStoreContext);
  if (!ctx) throw new Error('useNotesStore must be used within NotesStoreProvider');
  return ctx;
}
