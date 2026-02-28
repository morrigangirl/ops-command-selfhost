export interface Person {
  id: string;
  name: string;
  role: string;
  active: boolean;
  managerId: string | null;
  last1on1: string | null;
  lastStrategicDeepDive: string | null;
  lastHumanCheckin: string | null;
  default1on1CadenceDays: number;
  defaultStrategyCadenceDays: number;
  defaultCheckinCadenceDays: number;
}

export const CADENCE_PRESETS = {
  '1on1': [
    { label: 'Weekly', days: 7 },
    { label: 'Biweekly', days: 14 },
    { label: 'Monthly', days: 30 },
  ],
  strategy: [
    { label: 'Biweekly', days: 14 },
    { label: 'Monthly', days: 30 },
    { label: 'Quarterly', days: 90 },
  ],
  checkin: [
    { label: 'Weekly', days: 7 },
    { label: 'Biweekly', days: 14 },
    { label: 'Monthly', days: 30 },
  ],
} as const;

export const RISK_CADENCE_TEMPLATES: Record<string, { reviewCadence: Project['reviewCadence']; label: string }> = {
  low: { reviewCadence: 'monthly', label: 'Low Risk — Monthly review' },
  medium: { reviewCadence: 'biweekly', label: 'Medium Risk — Biweekly review' },
  high: { reviewCadence: 'weekly', label: 'High Risk — Weekly review' },
};

export interface ReviewEntry {
  id: string;
  date: string;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  problemStatement: string;
  strategicGoal: string;
  successMetric: string;
  ownerId: string;
  status: 'green' | 'yellow' | 'red';
  risk: 'low' | 'medium' | 'high';
  reviewCadence: 'weekly' | 'biweekly' | 'monthly';
  targetDate: string;
  createdDate: string;
  lastReviewed: string | null;
  reviewLog: ReviewEntry[];
  refinedBrief: string | null;
  workstreamId: string | null;
  externalRef: string | null;
  riskStatement: string;
  phase: string | null;
  tags: string[];
}

export interface Program {
  id: string;
  name: string;
  description: string;
  startDate: string | null;
  targetEndDate: string | null;
  status: 'active' | 'completed' | 'on-hold';
  createdAt: string;
  externalRef: string | null;
}

export interface Workstream {
  id: string;
  programId: string;
  name: string;
  description: string;
  sortOrder: number;
  externalRef: string | null;
  leadId: string | null;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: string | null;
  completed: boolean;
  completedDate: string | null;
  sortOrder: number;
}

export interface WorkItem {
  id: string;
  milestoneId: string | null;
  projectId: string;
  parentId: string | null;
  type: 'epic' | 'task' | 'subtask';
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  assigneeId: string | null;
  dueDate: string | null;
  sortOrder: number;
}

export interface DriftAlert {
  id: string;
  type: 'review-overdue' | 'strategy-gap' | 'checkin-gap';
  message: string;
  severity: 'warning' | 'critical';
  entityId: string;
  entityType: 'project' | 'person';
}

export const CADENCE_DAYS: Record<Project['reviewCadence'], number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

// ── Metrics ──

export const METRIC_CATEGORIES = [
  { value: 'detection_coverage', label: 'Detection coverage' },
  { value: 'alert_triage', label: 'Alert triage' },
  { value: 'ai_tier1', label: 'AI-driven Tier 1' },
  { value: 'automated_containment', label: 'Automated containment' },
  { value: 'user_reported', label: 'User-reported incidents handled' },
  { value: 'other', label: 'Other/custom' },
] as const;

export const METRIC_UNITS = [
  { value: 'count', label: 'Count' },
  { value: '%', label: '%' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'ratio', label: 'Ratio' },
  { value: 'score', label: 'Score' },
  { value: 'other', label: 'Other' },
] as const;

export const METRIC_CONFIDENCE = ['high', 'medium', 'low'] as const;
export type MetricConfidence = (typeof METRIC_CONFIDENCE)[number];

export const METRIC_STATUS = ['on_track', 'at_risk', 'off_track', 'unknown'] as const;
export type MetricStatus = (typeof METRIC_STATUS)[number];

export interface Metric {
  id: string;
  name: string;
  externalRef: string | null;
  category: string;
  definition: string;
  unit: string;
  currentValue: number | null;
  sourceNote: string | null;
  confidence: MetricConfidence;
  confidenceNote: string | null;
  ownerId: string | null;
  relatedProjectId: string | null;
  status: MetricStatus;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface MetricTarget {
  id: string;
  metricId: string;
  period: string;
  targetValue: number;
  targetNote: string | null;
}

export interface MetricEntry {
  id: string;
  metricId: string;
  entryDate: string;
  value: number;
  note: string | null;
  sourceNoteOverride: string | null;
  confidenceOverride: string | null;
}

// ── Rhythm / Meetings ──

export const MEETING_TYPES = ['1on1', 'strategy', 'checkin'] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  '1on1': '1:1',
  strategy: 'Strategy',
  checkin: 'Check-in',
};

export const MEETING_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const ACTION_ITEM_STATUSES = ['open', 'done', 'blocked'] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

export interface Meeting {
  id: string;
  personId: string;
  type: MeetingType;
  scheduledDate: string;
  status: MeetingStatus;
  agenda: string;
  notes: string;
  completedAt: string | null;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  title: string;
  ownerId: string | null;
  dueDate: string | null;
  projectId: string | null;
  status: ActionItemStatus;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  summary: string;
}

export interface EscalationFlag {
  personId: string;
  personName: string;
  blockedItemTitle: string;
  occurrences: number;
  meetingIds: string[];
}
