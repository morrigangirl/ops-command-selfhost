import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useRhythmStore } from '@/lib/rhythm-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonForm } from '@/components/PersonForm';
import { RemovePersonDialog } from '@/components/RemovePersonDialog';
import { MeetingForm } from '@/components/MeetingForm';
import { MeetingCard } from '@/components/MeetingCard';
import { ActionItemRow } from '@/components/ActionItemRow';
import { EscalationBanner } from '@/components/EscalationBanner';
import { useState } from 'react';
import { ArrowLeft, Plus, User, ChevronRight, Calendar, UserMinus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { MEETING_TYPE_LABELS, MeetingType } from '@/lib/types';
import { NotesPanel } from '@/components/NotesPanel';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPerson, people, getActiveProjectsForPerson } = useStore();
  const { getMeetingsForPerson, getOpenActionItemsForPerson, getEscalationFlags } = useRhythmStore();

  const person = getPerson(id || '');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  if (!person) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/people')} className="gap-2 text-xs font-mono mb-4">
          <ArrowLeft size={14} /> BACK
        </Button>
        <p className="text-muted-foreground text-sm">Person not found.</p>
      </div>
    );
  }

  const meetings = getMeetingsForPerson(person.id);
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
  const completedMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');
  const openActionItems = getOpenActionItemsForPerson(person.id);
  const escalationFlags = getEscalationFlags().filter(f => f.personId === person.id);
  const manager = person.managerId ? people.find(p => p.id === person.managerId) : null;
  const projectCount = getActiveProjectsForPerson(person.id).length;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <Button variant="ghost" onClick={() => navigate('/people')} className="gap-2 text-xs font-mono mb-4">
        <ArrowLeft size={14} /> PERSONNEL
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <User size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-wide">{person.name}</h1>
            <p className="text-sm text-muted-foreground">{person.role}</p>
            {manager && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <ChevronRight size={10} /> Reports to {manager.name}
              </p>
            )}
            <div className="flex gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
              <span>1:1 every {person.default1on1CadenceDays}d</span>
              <span>Strategy every {person.defaultStrategyCadenceDays}d</span>
              <span>Check-in every {person.defaultCheckinCadenceDays}d</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRemoveDialog(true)} className="text-xs font-mono gap-1 text-destructive hover:text-destructive">
            <UserMinus size={12} /> REMOVE
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)} className="text-xs font-mono">
            EDIT PROFILE
          </Button>
          <Button size="sm" onClick={() => setShowMeetingForm(true)} className="text-xs font-mono gap-1">
            <Plus size={12} /> SCHEDULE MEETING
          </Button>
        </div>
      </div>

      {/* Escalation banners */}
      {escalationFlags.length > 0 && (
        <div className="mb-4">
          <EscalationBanner flags={escalationFlags} />
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="border border-border rounded-lg p-3">
          <p className="text-[9px] font-mono text-muted-foreground tracking-wider">LAST 1:1</p>
          <p className="text-sm font-mono mt-1">{person.last1on1 ? format(parseISO(person.last1on1), 'MMM dd') : '—'}</p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <p className="text-[9px] font-mono text-muted-foreground tracking-wider">DEEP DIVE</p>
          <p className="text-sm font-mono mt-1">{person.lastStrategicDeepDive ? format(parseISO(person.lastStrategicDeepDive), 'MMM dd') : '—'}</p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <p className="text-[9px] font-mono text-muted-foreground tracking-wider">CHECK-IN</p>
          <p className="text-sm font-mono mt-1">{person.lastHumanCheckin ? format(parseISO(person.lastHumanCheckin), 'MMM dd') : '—'}</p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <p className="text-[9px] font-mono text-muted-foreground tracking-wider">PROJECTS</p>
          <p className="text-sm font-mono mt-1">{projectCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming" className="text-xs font-mono">
            Upcoming {scheduledMeetings.length > 0 && <Badge variant="outline" className="ml-1.5 text-[9px]">{scheduledMeetings.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-mono">History</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs font-mono">
            Action Items {openActionItems.length > 0 && <Badge variant="outline" className="ml-1.5 text-[9px]">{openActionItems.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {scheduledMeetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming meetings</p>
              <Button variant="outline" size="sm" onClick={() => setShowMeetingForm(true)} className="mt-3 text-xs font-mono gap-1">
                <Plus size={12} /> Schedule one
              </Button>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {scheduledMeetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {completedMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No meeting history yet.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {completedMeetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions">
          {openActionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No open action items.</p>
          ) : (
            <div className="space-y-1 mt-2">
              {openActionItems.map(item => (
                <ActionItemRow key={item.id} item={item} showOwner />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <NotesPanel targetType="person" targetId={person.id} />
      </div>

      <PersonForm open={showEditForm} onClose={() => setShowEditForm(false)} person={person} />
      <MeetingForm open={showMeetingForm} onClose={() => setShowMeetingForm(false)} personId={person.id} />
      <RemovePersonDialog open={showRemoveDialog} onClose={() => { setShowRemoveDialog(false); navigate('/people'); }} person={person} />
    </div>
  );
}
