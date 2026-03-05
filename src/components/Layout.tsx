import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Shield, LogOut, FolderKanban, TrendingUp, Briefcase, Trash2, Layers, MessageSquare, CalendarDays, Zap, CircleHelp, BookOpenText, StickyNote } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDialog } from '@/components/ProfileDialog';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AdvisorChatPanel, type AdvisorInvocationContext } from '@/components/AdvisorChatPanel';
import { PageHelpDialog } from '@/components/help/PageHelpDialog';
import { getFallbackHelpByPath, matchHelpRoute, type PageHelpSections } from '@/help/pageHelp';

function getAdvisorContextFromPath(pathname: string): AdvisorInvocationContext {
  const segments = pathname.split('/').filter(Boolean);

  if (pathname === '/') {
    return {
      sourcePath: pathname,
      sourceScreen: 'Command Board',
    };
  }

  if (pathname === '/projects') return { sourcePath: pathname, sourceScreen: 'Projects' };
  if (pathname === '/programs') return { sourcePath: pathname, sourceScreen: 'Programs' };
  if (pathname === '/workstreams') return { sourcePath: pathname, sourceScreen: 'Workstreams' };
  if (pathname === '/metrics') return { sourcePath: pathname, sourceScreen: 'Metrics' };
  if (pathname === '/people') return { sourcePath: pathname, sourceScreen: 'People' };
  if (pathname === '/calendar') return { sourcePath: pathname, sourceScreen: 'Calendar' };
  if (pathname === '/trash') return { sourcePath: pathname, sourceScreen: 'Trash' };
  if (pathname === '/tokens') return { sourcePath: pathname, sourceScreen: 'Token Usage' };
  if (pathname === '/notes') return { sourcePath: pathname, sourceScreen: 'Notes' };
  if (pathname === '/advisor') return { sourcePath: pathname, sourceScreen: 'Advisor' };
  if (pathname === '/help-content') return { sourcePath: pathname, sourceScreen: 'Help Content' };

  if (segments[0] === 'project' && segments[1]) {
    return {
      sourcePath: pathname,
      sourceScreen: 'Project Detail',
      sourceEntityType: 'project',
      sourceEntityId: segments[1],
    };
  }

  if (segments[0] === 'program' && segments[1]) {
    return {
      sourcePath: pathname,
      sourceScreen: 'Program Detail',
      sourceEntityType: 'program',
      sourceEntityId: segments[1],
    };
  }

  if (segments[0] === 'metric' && segments[1]) {
    return {
      sourcePath: pathname,
      sourceScreen: 'Metric Detail',
      sourceEntityType: 'metric',
      sourceEntityId: segments[1],
    };
  }

  if (segments[0] === 'person' && segments[1]) {
    return {
      sourcePath: pathname,
      sourceScreen: 'Person Detail',
      sourceEntityType: 'person',
      sourceEntityId: segments[1],
    };
  }

  return {
    sourcePath: pathname,
    sourceScreen: 'Current Screen',
  };
}

export function Layout() {
  const { getDriftAlerts } = useStore();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const alertCount = getDriftAlerts().length;
  const [showProfile, setShowProfile] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorContext, setAdvisorContext] = useState<AdvisorInvocationContext | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSourceLabel, setHelpSourceLabel] = useState<string>('fallback');
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const matchedHelpRoute = useMemo(() => matchHelpRoute(location.pathname), [location.pathname]);
  const fallbackHelp = useMemo(() => getFallbackHelpByPath(location.pathname), [location.pathname]);
  const [helpContent, setHelpContent] = useState<PageHelpSections>(fallbackHelp);
  const currentContext = useMemo(
    () => getAdvisorContextFromPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('user_id', user.id).single();
      if (data) setProfile(data);
    };
    fetch();
  }, [user, showProfile]);

  useEffect(() => {
    let cancelled = false;
    setHelpContent(fallbackHelp);
    setHelpSourceLabel('fallback');

    if (!user || !matchedHelpRoute) {
      setHelpLoading(false);
      return;
    }

    const loadHelp = async () => {
      setHelpLoading(true);

      const { data, error } = await supabase
        .from('page_help_content' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('route_key', matchedHelpRoute.routeKey)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) {
          setHelpContent({
            title: data.title,
            summary: data.summary,
            what_this_page_does: data.what_this_page_does,
            what_is_expected: data.what_is_expected,
            required_inputs: data.required_inputs,
            primary_actions: data.primary_actions,
            common_mistakes: data.common_mistakes,
            next_steps: data.next_steps,
          });
          setHelpSourceLabel(`${data.source} · v${data.version}`);
        }

        setHelpLoading(false);
      }
    };

    loadHelp();

    return () => {
      cancelled = true;
    };
  }, [user, matchedHelpRoute, fallbackHelp]);

  const initials = profile?.display_name ? profile.display_name.slice(0, 2).toUpperCase() : '??';

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-56 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h1 className="font-mono text-sm font-bold tracking-[0.2em] text-primary">OPS COMMAND</h1>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono tracking-wider mt-1">SECURITY OPERATIONS CENTER</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <LayoutDashboard size={16} />
            Command Board
            {alertCount > 0 && (
              <span className="ml-auto bg-warning/20 text-warning text-[10px] font-mono px-1.5 py-0.5 rounded">
                {alertCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/programs"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <FolderKanban size={16} />
            Programs
          </NavLink>
          <NavLink
            to="/workstreams"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Layers size={16} />
            Workstreams
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Briefcase size={16} />
            Projects
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <CalendarDays size={16} />
            Calendar
          </NavLink>
          <NavLink
            to="/metrics"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <TrendingUp size={16} />
            Metrics
          </NavLink>
          <NavLink
            to="/people"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Users size={16} />
            Personnel
          </NavLink>
          <NavLink
            to="/advisor"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <MessageSquare size={16} />
            Advisor
          </NavLink>
          <NavLink
            to="/notes"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <StickyNote size={16} />
            Notes
          </NavLink>
          <NavLink
            to="/trash"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Trash2 size={16} />
            Trash
          </NavLink>
          <NavLink
            to="/tokens"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Zap size={16} />
            Token Usage
          </NavLink>
          <NavLink
            to="/help-content"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <BookOpenText size={16} />
            Help Content
          </NavLink>
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2.5 w-full px-2 py-2 rounded hover:bg-accent transition-colors"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-mono text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium truncate">{profile?.display_name || 'Profile'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); signOut(); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Sign out">
              <LogOut size={14} />
            </button>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <ProfileDialog open={showProfile} onClose={() => setShowProfile(false)} />

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <button
          type="button"
          className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-600 text-white shadow-[0_10px_28px_rgba(16,185,129,0.35)] transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Open page help"
          title="Open page help"
          onClick={() => setHelpOpen(true)}
        >
          <CircleHelp size={18} className="mx-auto" />
        </button>
        <button
          type="button"
          className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_10px_30px_rgba(56,189,248,0.4)] transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Open AI advisor"
          title="Open AI advisor"
          onClick={() => {
            setAdvisorContext(currentContext);
            setAdvisorOpen(true);
          }}
        >
          <MessageSquare size={18} className="mx-auto" />
        </button>
      </div>

      <Dialog open={advisorOpen} onOpenChange={setAdvisorOpen}>
        <DialogContent className="w-[min(96vw,1200px)] max-w-none h-[min(90vh,820px)] p-0 overflow-hidden">
          <DialogTitle className="sr-only">AI Advisor</DialogTitle>
          <div className="h-full flex flex-col">
            <div className="border-b border-border px-4 py-2.5 bg-muted/30">
              <p className="text-xs font-mono tracking-wide text-muted-foreground">
                AI ADVISOR
                {advisorContext?.sourceScreen ? ` · ${advisorContext.sourceScreen}` : ''}
                {advisorContext?.sourceEntityId ? ` · ${advisorContext.sourceEntityId}` : ''}
              </p>
            </div>
            <AdvisorChatPanel className="flex-1 min-h-0" invocationContext={advisorContext} />
          </div>
        </DialogContent>
      </Dialog>

      <PageHelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        routeLabel={matchedHelpRoute?.routeTitle || currentContext.sourceScreen || 'Current Screen'}
        loading={helpLoading}
        content={helpContent}
        sourceLabel={helpSourceLabel}
        onEdit={() => {
          setHelpOpen(false);
          if (matchedHelpRoute?.routeKey) {
            navigate(`/help-content?route=${encodeURIComponent(matchedHelpRoute.routeKey)}`);
            return;
          }
          navigate('/help-content');
        }}
      />
    </div>
  );
}
