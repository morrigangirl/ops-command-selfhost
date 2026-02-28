import { useStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { ProjectForm } from '@/components/ProjectForm';
import { Plus, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Project } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

export default function ProjectsView() {
  const { projects, getNextReview, getPerson, deleteProject } = useStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const today = new Date();
  const filtered = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getRowClass = (project: Project) => {
    const nextReview = getNextReview(project);
    const targetDate = parseISO(project.targetDate);
    const daysToTarget = differenceInDays(targetDate, today);
    const isOverdueReview = today > nextReview;
    const isNearTarget = daysToTarget <= 14 && daysToTarget >= 0;

    if (isNearTarget && isOverdueReview) return 'bg-destructive/8 border-l-2 border-l-destructive';
    if (isOverdueReview) return 'bg-warning/8 border-l-2 border-l-warning';
    return '';
  };

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-[0.15em] text-foreground">PROJECTS</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Active project oversight &middot; {projects.length} projects tracked</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2 font-mono text-xs tracking-wider">
          <Plus size={14} /> NEW PROJECT
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 font-mono text-xs tracking-wider h-9 max-w-xs"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">PROJECT</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">OWNER</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">MANAGER</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">STATUS</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">RISK</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">TARGET</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">LAST REVIEW</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground">NEXT REVIEW</TableHead>
              <TableHead className="font-mono text-[10px] tracking-wider text-muted-foreground w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(project => {
              const owner = getPerson(project.ownerId);
              const manager = owner?.managerId ? getPerson(owner.managerId) : null;
              const nextReview = getNextReview(project);
              return (
                <TableRow
                  key={project.id}
                  className={cn('cursor-pointer hover:bg-muted/30 transition-colors', getRowClass(project))}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <TableCell className="font-medium text-sm">{project.name}</TableCell>
                  <TableCell className="text-sm text-foreground/70">{owner?.name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{manager?.name || '—'}</TableCell>
                  <TableCell><StatusBadge status={project.status} /></TableCell>
                  <TableCell><RiskBadge risk={project.risk} /></TableCell>
                  <TableCell className="font-mono text-xs text-foreground/70">{format(parseISO(project.targetDate), 'MMM dd')}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground/70">
                    {project.lastReviewed ? format(parseISO(project.lastReviewed), 'MMM dd') : '—'}
                  </TableCell>
                  <TableCell className={cn(
                    'font-mono text-xs',
                    today > nextReview ? 'text-warning font-semibold' : 'text-foreground/70',
                  )}>
                    {format(nextReview, 'MMM dd')}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors">
                          <Trash2 size={14} />
                        </button>
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
                            onClick={() => { deleteProject(project.id); toast({ title: 'Moved to trash' }); }}
                          >
                            Move to Trash
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                  {projects.length === 0 ? 'No projects yet. Create one to get started.' : 'No projects match your search.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <ProjectForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
