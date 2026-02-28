import { matchPath } from 'react-router-dom';

export interface PageHelpSections {
  title: string;
  summary: string;
  what_this_page_does: string;
  what_is_expected: string;
  required_inputs: string;
  primary_actions: string;
  common_mistakes: string;
  next_steps: string;
}

export interface PageHelpRouteDefinition {
  routeKey: string;
  pathPattern: string;
  routeTitle: string;
  pageDescription: string;
  expectedOutcome: string;
  primaryEntities: string[];
  primaryActions: string[];
  fallback: PageHelpSections;
}

export interface StoredPageHelp extends PageHelpSections {
  id: string;
  user_id: string;
  route_key: string;
  source: 'manual' | 'llm' | 'seed';
  version: number;
  created_at: string;
  updated_at: string;
}

function makeFallback(
  title: string,
  summary: string,
  whatThisPageDoes: string,
  whatIsExpected: string,
  requiredInputs: string,
  primaryActions: string,
  commonMistakes: string,
  nextSteps: string,
): PageHelpSections {
  return {
    title,
    summary,
    what_this_page_does: whatThisPageDoes,
    what_is_expected: whatIsExpected,
    required_inputs: requiredInputs,
    primary_actions: primaryActions,
    common_mistakes: commonMistakes,
    next_steps: nextSteps,
  };
}

export const PAGE_HELP_ROUTES: PageHelpRouteDefinition[] = [
  {
    routeKey: '/',
    pathPattern: '/',
    routeTitle: 'Command Board',
    pageDescription: 'Operational landing page showing active work, urgency signals, and action momentum.',
    expectedOutcome: 'You quickly identify where leadership attention is needed right now and open the right records.',
    primaryEntities: ['projects', 'metrics', 'meetings', 'alerts'],
    primaryActions: ['review drift alerts', 'open high-risk projects', 'start prioritized updates'],
    fallback: makeFallback(
      'Command Board',
      'Your mission control for daily operating rhythm and immediate risk visibility.',
      '- Aggregates active projects, risk posture, and drift signals into one triage view.\n- Highlights where schedule, ownership, or review cadence is slipping.\n- Surfaces items that need a decision, escalation, or unblock.',
      '- Review this page first at the start of each work cycle.\n- Prioritize red/yellow or stale items before low-risk maintenance work.\n- Open linked records and resolve uncertainty, not just status color.',
      '- Current project and review data should already exist.\n- Reliable status, risk, and date fields are required for meaningful output.\n- You need recent updates in project and people records to avoid stale guidance.',
      '- Open project details directly from problem areas.\n- Identify overdue reviews and schedule follow-up actions.\n- Use this board to decide what must be handled today versus deferred.',
      '- Treating color alone as truth without checking recent notes and trends.\n- Ignoring missing ownership or missing review cadence on high-impact items.\n- Using this page as a static dashboard instead of a decision queue.',
      '- Move into Project, Metric, or Person detail pages to take corrective action.\n- Record outcomes so this board reflects decisions on the next refresh.\n- If patterns repeat, open Advisor for strategic recommendations.',
    ),
  },
  {
    routeKey: '/programs',
    pathPattern: '/programs',
    routeTitle: 'Programs',
    pageDescription: 'Portfolio-level grouping of work by strategic objective.',
    expectedOutcome: 'Programs are clearly defined, current, and mapped to active workstreams.',
    primaryEntities: ['programs', 'workstreams'],
    primaryActions: ['create program', 'edit program scope', 'open program detail'],
    fallback: makeFallback(
      'Programs',
      'Top-level strategy containers that organize related workstreams and projects.',
      '- Lists all programs with high-level status context.\n- Provides entry points for creating and maintaining strategic initiative groups.\n- Helps separate long-running strategic themes from individual project execution.',
      '- Keep each program scoped to a clear strategic outcome.\n- Ensure every active program has named workstreams and current status.\n- Retire or archive obsolete programs to keep the portfolio readable.',
      '- Program name and purpose statement.\n- Optional timing and status context.\n- A clear boundary for what belongs inside vs outside the program.',
      '- Create new programs for net-new strategic initiatives.\n- Open program details to manage workstreams and linked projects.\n- Update naming and scope when strategy shifts.',
      '- Creating too many overlapping programs with unclear boundaries.\n- Treating programs as project lists instead of strategy umbrellas.\n- Leaving old programs active and diluting focus.',
      '- Continue to Program Detail to shape workstreams.\n- Align projects under the right workstream and owner.\n- Track execution drift from Command Board and Metrics.',
    ),
  },
  {
    routeKey: '/program/:id',
    pathPattern: '/program/:id',
    routeTitle: 'Program Detail',
    pageDescription: 'Deep view of a single program and its workstream/project structure.',
    expectedOutcome: 'Program structure is coherent, and all dependent workstreams/projects are aligned.',
    primaryEntities: ['program', 'workstreams', 'projects'],
    primaryActions: ['edit program', 'add workstream', 'review project distribution'],
    fallback: makeFallback(
      'Program Detail',
      'Control plane for one program and the workstreams that deliver it.',
      '- Shows one program with its workstreams and linked projects.\n- Helps validate execution coverage across strategic themes.\n- Supports edits to program metadata and structure.',
      '- Confirm each workstream has a clear purpose and active projects.\n- Balance effort so critical themes are not under-resourced.\n- Keep program naming, timing, and status current.',
      '- Clear workstream taxonomy for this program.\n- Project-to-workstream mapping that reflects reality.\n- Ownership clarity for each significant line of work.',
      '- Add or update workstreams as strategy evolves.\n- Move into project details to fix delivery issues.\n- Remove dead branches that no longer support outcomes.',
      '- Letting workstreams become catch-all buckets.\n- Keeping orphaned projects with no strategic connection.\n- Not updating program structure after major priority changes.',
      '- Move to Projects for execution tracking and risk review.\n- Use Metrics to confirm whether program outcomes are improving.\n- Use Advisor for options when tradeoffs are unclear.',
    ),
  },
  {
    routeKey: '/workstreams',
    pathPattern: '/workstreams',
    routeTitle: 'Workstreams',
    pageDescription: 'Cross-program view of thematic work execution lanes.',
    expectedOutcome: 'Workstreams are active, clearly scoped, and connected to meaningful projects.',
    primaryEntities: ['workstreams', 'programs', 'projects'],
    primaryActions: ['review workstream health', 're-scope workstream', 'open linked projects'],
    fallback: makeFallback(
      'Workstreams',
      'Thematic execution lanes that connect strategy to concrete project delivery.',
      '- Displays workstreams across programs and their current state.\n- Helps inspect whether work is grouped logically by domain or capability.\n- Reveals gaps where strategy exists without project execution.',
      '- Keep workstream names specific enough to guide project placement.\n- Ensure each workstream has ongoing execution and owner accountability.\n- Consolidate duplicates when overlap appears.',
      '- A program mapping for each workstream.\n- Purpose and focus area that teams can understand quickly.\n- Up-to-date linked projects for accurate health signals.',
      '- Open workstream-linked projects and validate status/risk quality.\n- Adjust structure when priorities shift or scope expands.\n- Archive stale workstreams that no longer serve active strategy.',
      '- Creating workstreams with vague names like "misc" or "general".\n- Splitting one coherent theme into too many tiny streams.\n- Leaving inactive workstreams visible and noisy.',
      '- Continue into Program Detail for structural changes.\n- Continue into Project Detail for execution issues.\n- Track outcome movement in Metrics after structural updates.',
    ),
  },
  {
    routeKey: '/projects',
    pathPattern: '/projects',
    routeTitle: 'Projects',
    pageDescription: 'Portfolio list of active execution efforts with risk and cadence context.',
    expectedOutcome: 'Project portfolio stays current, prioritized, and reviewable.',
    primaryEntities: ['projects', 'owners', 'cadence', 'risk'],
    primaryActions: ['create project', 'triage risk', 'open project detail'],
    fallback: makeFallback(
      'Projects',
      'Execution portfolio view for creating, sorting, and triaging initiatives.',
      '- Lists current projects and key execution fields.\n- Supports intake of new initiatives and status maintenance.\n- Gives quick access to deeper project records and review history.',
      '- Keep status, risk, cadence, and target dates accurate.\n- Promote clear owner assignment and realistic timelines.\n- Move or archive work that is no longer active.',
      '- Name, owner, target date, and strategic objective for each project.\n- Honest risk level and cadence that match delivery reality.\n- Links to the right program/workstream context when applicable.',
      '- Create, edit, and prioritize projects.\n- Filter for at-risk items and overdue review cycles.\n- Open detail pages to manage briefs, milestones, and updates.',
      '- Inflating project count without clear outcomes.\n- Marking green by default while dependencies are unresolved.\n- Failing to update dates after scope changes.',
      '- Move to Project Detail for detailed corrective actions.\n- Review related Metrics to confirm impact.\n- Use Command Board to monitor drift after updates.',
    ),
  },
  {
    routeKey: '/project/:id',
    pathPattern: '/project/:id',
    routeTitle: 'Project Detail',
    pageDescription: 'Single-project command view for scope, milestones, reviews, and AI refinement.',
    expectedOutcome: 'The project has a coherent brief, current risk posture, and concrete next actions.',
    primaryEntities: ['project', 'milestones', 'reviews', 'owner'],
    primaryActions: ['refine brief', 'update status', 'log review'],
    fallback: makeFallback(
      'Project Detail',
      'Execution truth source for one project, including intent and delivery progress.',
      '- Displays full project brief, risk context, cadence, and history.\n- Supports AI-assisted brief refinement and practical execution updates.\n- Provides the working surface for correcting drift before it escalates.',
      '- Keep problem, strategic goal, and success metric explicit and testable.\n- Update status/risk when reality changes, not just on schedule.\n- Record reviews with decisions and next steps.',
      '- A clear owner and target date.\n- Brief text that explains why this work matters.\n- Recent review notes to maintain operational continuity.',
      '- Edit project fields and save corrected assumptions.\n- Run AI refinement for clearer objective language when needed.\n- Add review entries that drive specific follow-up actions.',
      '- Confusing activity with progress toward success metric.\n- Letting review cadence slip on high-risk projects.\n- Keeping vague success criteria that cannot be measured.',
      '- Move to Metrics to track measurable impact.\n- Move to People to resolve ownership blockers.\n- Use Advisor if tradeoffs require scenario analysis.',
    ),
  },
  {
    routeKey: '/calendar',
    pathPattern: '/calendar',
    routeTitle: 'Calendar',
    pageDescription: 'Meeting rhythm planner for one-on-ones, strategy reviews, and check-ins.',
    expectedOutcome: 'Critical meetings are scheduled at the right cadence with clear purpose.',
    primaryEntities: ['meetings', 'people', 'cadence'],
    primaryActions: ['schedule meeting', 'review cadence coverage', 'open meeting context'],
    fallback: makeFallback(
      'Calendar',
      'Operational rhythm planner to keep leadership and follow-through predictable.',
      '- Shows scheduled and recent meetings across people and cadence types.\n- Helps prevent missed strategic deep-dives and one-on-one gaps.\n- Supports planned follow-up on decisions and action items.',
      '- Keep meeting cadence consistent with risk and role criticality.\n- Ensure each scheduled touchpoint has a clear objective.\n- Use completion tracking to avoid stale recurring meetings.',
      '- People records with cadence dates.\n- Meeting type and timing intent.\n- Action item ownership from previous sessions.',
      '- Schedule and complete meetings with updated notes.\n- Use AI-generated agendas where helpful for structure.\n- Confirm next meetings are set before closing a cycle.',
      '- Scheduling meetings without linking to concrete outcomes.\n- Skipping cadence updates after meetings complete.\n- Overloading the calendar with low-value recurring events.',
      '- Review Person Detail to validate support and accountability.\n- Update Project records when meeting outcomes change execution.\n- Use Command Board to watch resulting drift reduction.',
    ),
  },
  {
    routeKey: '/metrics',
    pathPattern: '/metrics',
    routeTitle: 'Metrics',
    pageDescription: 'Catalog of tracked operational metrics and health indicators.',
    expectedOutcome: 'Each important objective has measurable, current signal data.',
    primaryEntities: ['metrics', 'targets', 'entries'],
    primaryActions: ['create metric', 'inspect trends', 'open metric detail'],
    fallback: makeFallback(
      'Metrics',
      'Portfolio view of strategic and operational indicators.',
      '- Lists metrics and trend context used to evaluate execution impact.\n- Highlights where data is stale, drifting, or misaligned with targets.\n- Supports metric creation and maintenance.',
      '- Keep metric definitions specific and decision-relevant.\n- Ensure entries are current enough to guide action.\n- Retire vanity metrics that do not change decisions.',
      '- Metric owner or accountable role.\n- Definition, unit, and target logic.\n- Reliable entry cadence with consistent measurement method.',
      '- Create and update metrics with clear purpose.\n- Open metric detail to manage targets and data points.\n- Compare movement against project execution changes.',
      '- Tracking outputs that do not map to outcomes.\n- Missing data points during high-risk periods.\n- Changing metric definition without documenting it.',
      '- Use Metric Detail for entries and target adjustments.\n- Cross-check projects linked to lagging signals.\n- Escalate persistent trends via Advisor or program reprioritization.',
    ),
  },
  {
    routeKey: '/metric/:id',
    pathPattern: '/metric/:id',
    routeTitle: 'Metric Detail',
    pageDescription: 'Single-metric workspace for entries, targets, and trend interpretation.',
    expectedOutcome: 'Metric trend is interpretable and tied to concrete operational decisions.',
    primaryEntities: ['metric', 'targets', 'entries'],
    primaryActions: ['add entry', 'set target', 'review trend against plan'],
    fallback: makeFallback(
      'Metric Detail',
      'Detailed signal management for one metric and its target trajectory.',
      '- Displays history, targets, and current directional signal for one metric.\n- Supports entry updates and target calibration.\n- Helps validate whether interventions are producing measurable change.',
      '- Keep entries timely and methodologically consistent.\n- Set targets that are ambitious but realistic.\n- Explain anomalies before making major decisions.',
      '- Accurate metric definition and measurement method.\n- Timely entry values and dates.\n- Target ranges that reflect current strategic intent.',
      '- Add new data entries and adjust targets when justified.\n- Interpret trend movement in context of ongoing projects.\n- Identify threshold breaches and trigger corrective actions.',
      '- Overreacting to one data point without trend context.\n- Changing targets to hide underperformance.\n- Ignoring data quality issues in collection.',
      '- Feed findings back into Project and Program prioritization.\n- Update Command Board decisions based on trend direction.\n- Capture rationale in review notes for future audits.',
    ),
  },
  {
    routeKey: '/people',
    pathPattern: '/people',
    routeTitle: 'Personnel',
    pageDescription: 'Roster and health view for key operators, leaders, and stakeholders.',
    expectedOutcome: 'Ownership is clear, check-ins are current, and people risk is visible.',
    primaryEntities: ['people', 'managers', 'cadence dates'],
    primaryActions: ['add person', 'update role/manager', 'open person detail'],
    fallback: makeFallback(
      'Personnel',
      'People operations view for ownership clarity and leadership cadence.',
      '- Lists people records with role and check-in cadence signals.\n- Supports onboarding, ownership mapping, and relationship structure.\n- Reveals overdue people touchpoints that can become delivery risk.',
      '- Keep role and manager fields current.\n- Update cadence dates after each relevant meeting type.\n- Remove inactive records to preserve roster quality.',
      '- Name, role, manager relationship, and active status.\n- Last cadence timestamps for 1:1, strategy deep dive, and human check-in.\n- Reliable linkage to owned projects where applicable.',
      '- Add and update people records.\n- Identify overdue support conversations.\n- Open person detail for focused context and actions.',
      '- Leaving stale inactive users in operational views.\n- Forgetting to update cadence dates after meetings.\n- Assigning project ownership to people not in the roster.',
      '- Continue into Person Detail to handle interventions.\n- Align project ownership where gaps exist.\n- Use Calendar to schedule corrective touchpoints.',
    ),
  },
  {
    routeKey: '/person/:id',
    pathPattern: '/person/:id',
    routeTitle: 'Person Detail',
    pageDescription: 'Focused view of one person, their role context, and leadership cadence.',
    expectedOutcome: 'Support, accountability, and workload signals are current for this person.',
    primaryEntities: ['person', 'manager', 'meeting cadence', 'owned work'],
    primaryActions: ['update person record', 'check cadence health', 'remove person safely'],
    fallback: makeFallback(
      'Person Detail',
      'Individual operating context for leadership support and accountability decisions.',
      '- Shows one person with role, manager linkage, and cadence data.\n- Helps track leadership contact frequency and ownership risk.\n- Supports record corrections and structured removal workflow.',
      '- Keep this record current after organizational or role changes.\n- Ensure cadence dates reflect actual completed meetings.\n- Resolve ownership dependencies before removing a person.',
      '- Accurate role and manager mapping.\n- Current cadence timestamps.\n- Visibility into projects or action items impacted by this person.',
      '- Update person data and leadership rhythm markers.\n- Trigger follow-up scheduling when cadence is stale.\n- Use removal flow only after reassignment decisions are made.',
      '- Removing a person before reassigning critical ownership.\n- Treating cadence completion as optional.\n- Ignoring role drift after reorg changes.',
      '- Reassign related projects and action items.\n- Update Calendar for follow-up coverage.\n- Review Command Board for post-change drift signals.',
    ),
  },
  {
    routeKey: '/advisor',
    pathPattern: '/advisor',
    routeTitle: 'Advisor',
    pageDescription: 'AI strategy copilot with access to your operational data context.',
    expectedOutcome: 'You leave with concrete next actions, tradeoff analysis, or decision framing.',
    primaryEntities: ['chat sessions', 'system context', 'operational tables'],
    primaryActions: ['ask focused questions', 'request prioritized plan', 'capture outputs'],
    fallback: makeFallback(
      'Advisor',
      'Interactive AI advisory surface for analysis, planning, and recommendations.',
      '- Uses your system data context to answer operational questions.\n- Supports scenario analysis, prioritization, and next-step planning.\n- Can be used from dedicated page or modal invocation from any screen.',
      '- Ask specific, outcome-oriented questions tied to decisions.\n- Validate recommendations against current constraints and ownership.\n- Convert useful outputs into concrete updates in records.',
      '- A clear question with scope, timeline, and decision objective.\n- Optional context about current blockers or constraints.\n- Updated data in core tables for best answer quality.',
      '- Start new chats for new topics; keep threads coherent.\n- Ask for ranked options, not generic advice.\n- Request explicit action lists and risk assumptions.',
      '- Asking broad questions without desired outcome criteria.\n- Treating AI output as final truth without validation.\n- Not converting recommendations into tracked work.',
      '- Update Projects, Metrics, or Calendar with selected actions.\n- Save useful reasoning in review notes.\n- Revisit Advisor after new data changes assumptions.',
    ),
  },
  {
    routeKey: '/trash',
    pathPattern: '/trash',
    routeTitle: 'Trash',
    pageDescription: 'Recovery and permanent deletion area for soft-deleted records.',
    expectedOutcome: 'Accidental deletions are recoverable and permanent purge is deliberate.',
    primaryEntities: ['deleted programs', 'deleted workstreams', 'deleted projects'],
    primaryActions: ['restore item', 'permanently delete item', 'empty trash'],
    fallback: makeFallback(
      'Trash',
      'Safety buffer for soft-deleted portfolio records.',
      '- Lists items removed from active views but not yet permanently deleted.\n- Allows restore operations when removal was premature.\n- Supports irreversible cleanup when records are no longer needed.',
      '- Verify dependency impact before permanent deletion.\n- Restore promptly if active work was removed by mistake.\n- Keep trash clean to reduce confusion and noise.',
      '- Understanding of whether record history is still needed.\n- Confidence that ownership and references are handled before purge.\n- Intentional decision criteria for restore vs delete.',
      '- Restore individual items back to active workflow.\n- Permanently delete single items or empty the full trash.\n- Confirm results by revisiting original list pages.',
      '- Permanently deleting records during active incidents.\n- Forgetting that restoration may be needed for audits or continuity.\n- Leaving trash full and losing signal on recent removals.',
      '- Return to Programs/Projects/Workstreams to verify active state.\n- Recreate missing links if dependency chains were affected.\n- Document deletion rationale for governance.',
    ),
  },
  {
    routeKey: '/tokens',
    pathPattern: '/tokens',
    routeTitle: 'Token Usage',
    pageDescription: 'Usage analytics for LLM function calls and token spend.',
    expectedOutcome: 'You understand AI usage trends and can manage cost/performance tradeoffs.',
    primaryEntities: ['token_usage records', 'function summaries', 'daily trends'],
    primaryActions: ['review usage by function', 'review daily trends', 'inspect call log'],
    fallback: makeFallback(
      'Token Usage',
      'Operational visibility into AI call volume and token consumption.',
      '- Shows total prompt/completion usage and per-function distribution.\n- Supports trend monitoring across days and feature surfaces.\n- Helps detect unusual spikes and optimize expensive workflows.',
      '- Review this page regularly after adding new AI-assisted flows.\n- Investigate sudden token increases by function.\n- Balance output quality with usage efficiency.',
      '- Reliable function logging and consistent model usage metadata.\n- Awareness of normal baseline usage for comparison.\n- Understanding of which workflows are mission-critical.',
      '- Compare usage by function and by day.\n- Inspect call log for timing and model detail.\n- Prioritize optimization on highest-impact cost drivers.',
      '- Optimizing low-cost paths while ignoring true usage hotspots.\n- Misreading temporary spikes as long-term trends.\n- Ignoring model changes that alter token behavior.',
      '- Tune prompts or workflow frequency where needed.\n- Re-check after deployments that alter AI behavior.\n- Keep a simple threshold policy for anomaly response.',
    ),
  },
  {
    routeKey: '/help-content',
    pathPattern: '/help-content',
    routeTitle: 'Help Content',
    pageDescription: 'Editorial control panel for all route-level help popups.',
    expectedOutcome: 'Every page has accurate, editable, and versioned help content.',
    primaryEntities: ['page_help_content', 'route catalog', 'help versions'],
    primaryActions: ['edit content', 'save', 'generate with AI', 'generate missing'],
    fallback: makeFallback(
      'Help Content',
      'Admin surface to maintain the instructional experience across the app.',
      '- Lets you edit help text for every route in one place.\n- Supports AI draft generation and manual refinement.\n- Stores versioned updates in the database for audit and rollback context.',
      '- Keep instructions concrete, role-specific, and current.\n- Save manual improvements after validating real workflow fit.\n- Generate drafts for missing pages, then review before relying on them.',
      '- Clear route-level understanding of each page purpose and workflow.\n- Editorial judgment on language clarity and operational accuracy.\n- MFA-verified authenticated session for protected updates.',
      '- Select route, edit sections, and save changes.\n- Generate AI draft content for one page or missing pages in bulk.\n- Preview resulting modal behavior from any page.',
      '- Publishing generated text without reviewing for your workflow.\n- Leaving key pages without expectations or required-input guidance.\n- Overwriting useful manual edits accidentally.',
      '- Open target page and validate popup quality in context.\n- Iterate copy where users still ask repetitive questions.\n- Periodically review versions after major product workflow changes.',
    ),
  },
];

const GENERIC_HELP: PageHelpSections = makeFallback(
  'Page Help',
  'Context-aware instructions for the current screen are unavailable.',
  '- This page does not have a specific help profile yet.\n- You can still create one from the Help Content editor.',
  '- Identify the main objective and expected outcome for this page.\n- Document required inputs and critical actions for future users.',
  '- Route-specific context and expected workflow details.',
  '- Open Help Content and create a detailed profile for this route.',
  '- Leaving fallback help in place for high-use pages.',
  '- Add and save detailed content in Help Content, then retry this popup.',
);

export function matchHelpRoute(pathname: string): PageHelpRouteDefinition | null {
  for (const def of PAGE_HELP_ROUTES) {
    const matched = matchPath({ path: def.pathPattern, end: true }, pathname);
    if (matched) return def;
  }
  return null;
}

export function getFallbackHelpByPath(pathname: string): PageHelpSections {
  const matched = matchHelpRoute(pathname);
  return matched?.fallback ?? GENERIC_HELP;
}

export function getFallbackHelpByRouteKey(routeKey: string): PageHelpSections {
  const matched = PAGE_HELP_ROUTES.find((def) => def.routeKey === routeKey);
  return matched?.fallback ?? GENERIC_HELP;
}
