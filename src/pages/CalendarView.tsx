import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useRhythmStore } from '@/lib/rhythm-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  CalendarRange,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns';
import {
  CADENCE_DAYS,
  MEETING_TYPE_LABELS,
  type MeetingType,
  type Project,
  type Person,
} from '@/lib/types';

type ViewMode = 'month' | 'week' | 'agenda';

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  type: 'meeting' | 'projected-meeting' | 'project-review';
  subtype?: string;
  personName?: string;
  projectName?: string;
  status?: string;
}

function getProjectedMeetings(people: Person[], existingDates: Set<string>): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const horizon = addDays(new Date(), 90);

  for (const person of people) {
    if (!person.active) continue;

    const cadences: { type: MeetingType; lastDate: string | null; days: number }[] = [
      { type: '1on1', lastDate: person.last1on1, days: person.default1on1CadenceDays },
      { type: 'strategy', lastDate: person.lastStrategicDeepDive, days: person.defaultStrategyCadenceDays },
      { type: 'checkin', lastDate: person.lastHumanCheckin, days: person.defaultCheckinCadenceDays },
    ];

    for (const c of cadences) {
      const start = c.lastDate ? addDays(parseISO(c.lastDate), c.days) : addDays(new Date(), c.days);
      let next = start;
      while (next <= horizon) {
        const key = `${person.id}-${c.type}-${format(next, 'yyyy-MM-dd')}`;
        if (!existingDates.has(key)) {
          events.push({
            id: `proj-${key}`,
            date: next,
            title: `${MEETING_TYPE_LABELS[c.type]} with ${person.name}`,
            type: 'projected-meeting',
            subtype: c.type,
            personName: person.name,
          });
        }
        next = addDays(next, c.days);
      }
    }
  }
  return events;
}

function getProjectReviewDates(projects: Project[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const horizon = addDays(new Date(), 90);

  for (const project of projects) {
    const cadenceDays = CADENCE_DAYS[project.reviewCadence] || 14;
    const start = project.lastReviewed
      ? addDays(parseISO(project.lastReviewed), cadenceDays)
      : addDays(new Date(), cadenceDays);
    let next = start;
    while (next <= horizon) {
      events.push({
        id: `review-${project.id}-${format(next, 'yyyy-MM-dd')}`,
        date: next,
        title: `Review: ${project.name}`,
        type: 'project-review',
        projectName: project.name,
        status: project.status,
      });
      next = addDays(next, cadenceDays);
    }
  }
  return events;
}

const typeColors: Record<CalendarEvent['type'], string> = {
  'meeting': 'bg-primary/15 text-primary border-primary/30',
  'projected-meeting': 'bg-muted text-muted-foreground border-border border-dashed',
  'project-review': 'bg-accent text-accent-foreground border-accent',
};

const typeDots: Record<CalendarEvent['type'], string> = {
  'meeting': 'bg-primary',
  'projected-meeting': 'bg-muted-foreground',
  'project-review': 'bg-accent-foreground',
};

function EventBadge({ event }: { event: CalendarEvent }) {
  return (
    <div
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded border truncate leading-tight',
        typeColors[event.type]
      )}
      title={event.title}
    >
      {event.title}
    </div>
  );
}

export default function CalendarView() {
  const { people, projects } = useStore();
  const { meetings } = useRhythmStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const { getPerson } = useStore();

  const allEvents = useMemo(() => {
    // Scheduled meetings
    const scheduledMeetings: CalendarEvent[] = meetings
      .filter(m => m.status !== 'cancelled')
      .map(m => {
        const person = getPerson(m.personId);
        return {
          id: m.id,
          date: parseISO(m.scheduledDate),
          title: `${MEETING_TYPE_LABELS[m.type]} with ${person?.name || 'Unknown'}`,
          type: 'meeting' as const,
          subtype: m.type,
          personName: person?.name,
          status: m.status,
        };
      });

    // Build set of existing meeting keys to avoid duplicates
    const existingKeys = new Set(
      scheduledMeetings.map(m => {
        const meeting = meetings.find(mt => mt.id === m.id);
        return meeting ? `${meeting.personId}-${meeting.type}-${m.date.toISOString().slice(0, 10)}` : '';
      })
    );

    const projected = getProjectedMeetings(people.filter(p => p.active), existingKeys);
    const reviews = getProjectReviewDates(projects);

    return [...scheduledMeetings, ...projected, ...reviews].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [meetings, people, projects, getPerson]);

  const getEventsForDay = (day: Date) =>
    allEvents.filter(e => isSameDay(e.date, day));

  // Navigation
  const goNext = () =>
    setCurrentDate(prev =>
      viewMode === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1)
    );
  const goPrev = () =>
    setCurrentDate(prev =>
      viewMode === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1)
    );
  const goToday = () => setCurrentDate(new Date());

  // Month grid days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Agenda: next 30 days
  const agendaEvents = allEvents.filter(
    e => e.date >= new Date() && e.date <= addDays(new Date(), 30)
  );

  const headerLabel =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : viewMode === 'week'
        ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
        : 'Upcoming 30 Days';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">CALENDAR</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Meetings • Cadence Projections • Project Reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-md overflow-hidden">
            {([
              { mode: 'month' as ViewMode, icon: LayoutGrid, label: 'Month' },
              { mode: 'week' as ViewMode, icon: CalendarRange, label: 'Week' },
              { mode: 'agenda' as ViewMode, icon: List, label: 'Agenda' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs font-mono">
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{headerLabel}</h2>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', typeDots['meeting'])} />
            Scheduled
          </span>
          <span className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', typeDots['projected-meeting'])} />
            Projected
          </span>
          <span className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', typeDots['project-review'])} />
            Review
          </span>
        </div>
      </div>

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="px-2 py-1.5 text-[10px] font-mono text-muted-foreground text-center border-b border-border">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[100px] border-b border-r border-border p-1',
                    !inMonth && 'bg-muted/30',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'text-xs font-mono mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                      isToday(day) && 'bg-primary text-primary-foreground',
                      !inMonth && 'text-muted-foreground/50'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <EventBadge key={e.id} event={e} />
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[9px] text-muted-foreground font-mono pl-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={i}
                className={cn(
                  'border border-border rounded-lg p-2 min-h-[300px]',
                  isToday(day) && 'border-primary bg-primary/5'
                )}
              >
                <div className="text-center mb-2">
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {format(day, 'EEE')}
                  </p>
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      isToday(day) && 'text-primary'
                    )}
                  >
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1">
                  {dayEvents.map(e => (
                    <EventBadge key={e.id} event={e} />
                  ))}
                  {dayEvents.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/50 text-center font-mono mt-4">
                      —
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agenda View */}
      {viewMode === 'agenda' && (
        <div className="space-y-1">
          {agendaEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground font-mono">No events in the next 30 days</p>
            </div>
          ) : (
            (() => {
              let lastDateStr = '';
              return agendaEvents.map(e => {
                const dateStr = format(e.date, 'EEEE, MMMM d');
                const showDate = dateStr !== lastDateStr;
                lastDateStr = dateStr;
                return (
                  <div key={e.id}>
                    {showDate && (
                      <div className="flex items-center gap-2 pt-3 pb-1">
                        <p
                          className={cn(
                            'text-xs font-mono font-semibold',
                            isToday(e.date) && 'text-primary'
                          )}
                        >
                          {isToday(e.date) ? 'TODAY' : dateStr.toUpperCase()}
                        </p>
                        <div className="flex-1 border-t border-border" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md border',
                        typeColors[e.type]
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', typeDots[e.type])} />
                      <span className="text-sm flex-1">{e.title}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {e.type === 'meeting'
                          ? 'Scheduled'
                          : e.type === 'projected-meeting'
                            ? 'Projected'
                            : 'Review'}
                      </Badge>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      )}
    </div>
  );
}
