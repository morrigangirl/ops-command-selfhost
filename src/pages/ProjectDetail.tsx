import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { ProjectForm } from '@/components/ProjectForm';
import { ArrowLeft, Sparkles, Plus, CalendarDays, Save, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { MilestoneSection } from '@/components/MilestoneSection';
import { NotesPanel } from '@/components/NotesPanel';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, getPerson, getNextReview, addReviewEntry, updateProject, deleteProject } = useStore();
  const project = getProject(id || '');

  const [showEdit, setShowEdit] = useState(false);
  const [reviewDate, setReviewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reviewNotes, setReviewNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 mb-4">
          <ArrowLeft size={16} /> Back
        </Button>
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const owner = getPerson(project.ownerId);
  const manager = owner?.managerId ? getPerson(owner.managerId) : null;
  const nextReview = getNextReview(project);

  const handleAddReview = () => {
    if (!reviewNotes.trim()) return;
    addReviewEntry(project.id, { date: reviewDate, notes: reviewNotes });
    setReviewNotes('');
    setReviewDate(format(new Date(), 'yyyy-MM-dd'));
    toast({ title: 'Review entry added', description: 'Last Reviewed date updated.' });
  };

  const handleRefineBrief = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('refine-brief', {
        body: {
          problemStatement: project.problemStatement,
          strategicGoal: project.strategicGoal,
          successMetric: project.successMetric,
          risk: project.risk,
          reviewCadence: project.reviewCadence,
          projectName: project.name,
        },
      });

      if (error) throw error;
      setAiResult(data.result);
    } catch (e) {
      console.error('AI error:', e);
      toast({
        title: 'AI unavailable',
        description: 'Could not connect to AI service. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveBrief = async () => {
    if (!aiResult || !project) return;
    await updateProject({ ...project, refinedBrief: aiResult });
    setAiResult(null);
    toast({ title: 'Refined brief saved', description: 'The AI brief has been saved to the project.' });
  };

  return (
    <div className="p-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> COMMAND BOARD
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-wider">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={project.status} />
            <RiskBadge risk={project.risk} />
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              {project.reviewCadence} review
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefineBrief} disabled={aiLoading} className="gap-2 font-mono text-xs">
            <Sparkles size={14} /> {aiLoading ? 'REFINING...' : 'REFINE BRIEF'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="font-mono text-xs">
            EDIT
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-mono text-xs text-destructive hover:text-destructive">
                <Trash2 size={14} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{project.name}" will be moved to trash. You can restore it within 7 days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => { deleteProject(project.id); navigate('/'); toast({ title: 'Moved to trash' }); }}
                >
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* AI Result (unsaved) */}
      {aiResult && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-xs text-primary tracking-wider flex items-center gap-2">
              <Sparkles size={12} /> AI REFINED BRIEF
            </h3>
            <Button size="sm" variant="outline" onClick={handleSaveBrief} className="gap-1 font-mono text-xs">
              <Save size={12} /> SAVE BRIEF
            </Button>
          </div>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{aiResult}</p>
        </div>
      )}

      {/* Saved Refined Brief */}
      {project.refinedBrief && !aiResult && (
        <div className="border border-border rounded-lg p-4 mb-6 bg-muted/30">
          <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-2 flex items-center gap-2">
            <Sparkles size={12} /> SAVED REFINED BRIEF
          </h3>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{project.refinedBrief}</p>
        </div>
      )}

      {/* Project Details Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <DetailBlock label="PROBLEM STATEMENT" value={project.problemStatement} />
          <DetailBlock label="STRATEGIC GOAL" value={project.strategicGoal} />
          <DetailBlock label="SUCCESS METRIC" value={project.successMetric} />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailBlock label="OWNER" value={owner?.name || '—'} />
            <DetailBlock label="MANAGER" value={manager?.name || '—'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DetailBlock label="TARGET DATE" value={format(parseISO(project.targetDate), 'MMM dd, yyyy')} />
            <DetailBlock label="NEXT REVIEW" value={format(nextReview, 'MMM dd, yyyy')} />
          </div>
          <DetailBlock label="LAST REVIEWED" value={project.lastReviewed ? format(parseISO(project.lastReviewed), 'MMM dd, yyyy') : 'Never'} />
          <DetailBlock label="CREATED" value={format(parseISO(project.createdDate), 'MMM dd, yyyy')} />
        </div>
      </div>

      {/* Review Log */}
      <div className="border-t border-border pt-6">
        <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-2">
          <CalendarDays size={12} /> REVIEW LOG
        </h2>

        {/* Add Review Entry */}
        <div className="border border-border rounded-lg p-4 mb-4 bg-card">
          <div className="flex gap-3 items-end">
            <div className="shrink-0">
              <label className="text-[10px] font-mono text-muted-foreground block mb-1">DATE</label>
              <Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-mono text-muted-foreground block mb-1">NOTES</label>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Review notes..." rows={2} />
            </div>
            <Button size="sm" onClick={handleAddReview} className="gap-1 font-mono text-xs shrink-0">
              <Plus size={12} /> ADD
            </Button>
          </div>
        </div>

        {/* Review Entries */}
        <div className="space-y-2">
          {[...project.reviewLog].reverse().map(entry => (
            <div key={entry.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-primary">{format(parseISO(entry.date), 'MMM dd, yyyy')}</span>
              </div>
              <p className="text-sm text-foreground/80">{entry.notes}</p>
            </div>
          ))}
          {project.reviewLog.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No review entries yet.</p>
          )}
        </div>
      </div>

      {/* Milestones & Work Breakdown */}
      <MilestoneSection projectId={project.id} />

      <div className="mt-6">
        <NotesPanel targetType="project" targetId={project.id} />
      </div>

      <ProjectForm open={showEdit} onClose={() => setShowEdit(false)} project={project} />
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</span>
      <p className="text-sm text-foreground/80">{value}</p>
    </div>
  );
}
