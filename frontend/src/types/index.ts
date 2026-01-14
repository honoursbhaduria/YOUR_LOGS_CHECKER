/**
 * TypeScript types for the application
 */

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Case {
  id: number;
  name: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
  created_by: User;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  evidence_count: number;
  event_count: number;
}

export interface EvidenceFile {
  id: number;
  case: number;
  filename: string;
  file: string;
  file_hash: string;
  file_size: number;
  log_type: 'CSV' | 'SYSLOG' | 'EVTX' | 'JSON' | 'UNKNOWN';
  uploaded_by: User;
  uploaded_at: string;
  is_parsed: boolean;
  parsed_at?: string;
  parse_error?: string;
  event_count: number;
}

export interface ParsedEvent {
  id: number;
  evidence_file: number;
  evidence_filename: string;
  timestamp: string;
  user: string;
  host: string;
  event_type: string;
  raw_message: string;
  line_number: number;
  parsed_at: string;
}

export interface ScoredEvent {
  id: number;
  parsed_event: ParsedEvent;
  confidence: number;
  risk_label: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  feature_scores: Record<string, number>;
  is_archived: boolean;
  archived_at?: string;
  inference_text?: string;
  inference_generated_at?: string;
  inference_model?: string;
  manual_explanation?: string;
  is_false_positive: boolean;
  reviewed_by?: User;
  reviewed_at?: string;
  scored_at: string;
  // Flattened fields
  timestamp: string;
  event_type: string;
  raw_message: string;
}

export interface StoryPattern {
  id: number;
  case: number;
  title: string;
  narrative_text: string;
  attack_phase: string;
  scored_events: ScoredEvent[];
  avg_confidence: number;
  event_count: number;
  time_span_start: string;
  time_span_end: string;
  generated_by_model: string;
  generated_at: string;
  regenerated_count: number;
}

export interface InvestigationNote {
  id: number;
  case: number;
  scored_event?: number;
  content: string;
  created_by: User;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: number;
  case: number;
  format: 'PDF' | 'JSON';
  file: string;
  file_hash: string;
  generated_by: User;
  generated_at: string;
  version: number;
  // Additional fields that may be returned by API
  title?: string;
  content?: string;
  file_path?: string;
  created_at?: string;
}

export interface DashboardSummary {
  total_cases: number;
  total_evidence_files: number;
  total_events: number;
  high_risk_events: number;
  critical_events: number;
  recent_cases: Case[];
  risk_distribution: Record<string, number>;
  confidence_distribution: Record<string, number>;
}

export interface TimelineEvent {
  timestamp: string;
  event_type: string;
  confidence: number;
  risk_label: string;
}
