import { BodyWeatherLevel } from "../app/bodyWeather";

export interface AppMetaEntry {
  key: string;
  value: unknown;
}

export interface ProfileRecord {
  id: string;
  display_name: string | null;
  height_cm: number | null;
  body_goal: string | null;
  weight_unit: string;
  distance_unit: string;
  duration_unit: string;
  created_at: string;
  updated_at: string;
}

export interface TimestampedRecord {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  delete_after: string | null;
}

export interface BodyMeasurementRecord extends TimestampedRecord {
  occurred_on: string;
  occurred_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  skeletal_muscle_kg: number | null;
  source: string | null;
  condition: string | null;
  note: string | null;
}

export interface ExerciseRecord extends TimestampedRecord {
  occurred_on: string;
  occurred_at: string;
  exercise_type: string;
  duration_min: number | null;
  distance_km: number | null;
  intensity: string | null;
  content: string | null;
  body_feeling: string | null;
  note: string | null;
}

export interface MenstrualRecord extends TimestampedRecord {
  occurred_on: string;
  event_type: "start" | "end";
  flow: string | null;
  symptoms: string[];
  note: string | null;
}

export interface BodyStatusRecord extends TimestampedRecord {
  occurred_on: string;
  occurred_at: string;
  weather_level: BodyWeatherLevel | null;
  status_tags: string[];
  note: string | null;
}

export type LearningProjectStatus = "planned" | "active" | "paused" | "completed";
export type LearningStageStatus = "pending" | "active" | "completed" | "skipped";
export type LearningResourceType =
  | "book"
  | "course"
  | "article"
  | "video"
  | "tool"
  | "exercise"
  | "other";
export type LearningResourceStatus =
  | "evaluating"
  | "active"
  | "paused"
  | "completed"
  | "rejected";
export type LearningRoutineFrequency = "daily" | "weekdays" | "weekly";
export type LearningCompletionLevel = "minimum" | "standard" | "extra" | "freeform";
export type LearningAssessmentType =
  | "test"
  | "recall"
  | "explanation"
  | "writing"
  | "speaking"
  | "practical_task"
  | "simulation"
  | "other";

export interface LearningDomainRecord extends TimestampedRecord {
  name: string;
  description: string | null;
}

export interface LearningProjectRecord extends TimestampedRecord {
  domain_id: string;
  title: string;
  status: LearningProjectStatus;
  goal: string | null;
  current_level: string | null;
  target_state: string | null;
  motivation: string | null;
  start_date: string;
  target_date: string | null;
  weekly_time_budget_min: number | null;
  constraints: string | null;
  preferred_methods: string | null;
}

export interface LearningPathStageRecord extends TimestampedRecord {
  project_id: string;
  sort_order: number;
  title: string;
  stage_goal: string | null;
  completion_criteria: string | null;
  status: LearningStageStatus;
}

export interface LearningResourceRecord extends TimestampedRecord {
  project_id: string;
  name: string;
  resource_type: LearningResourceType;
  purpose: string | null;
  url: string | null;
  status: LearningResourceStatus;
  evaluation: string | null;
  note: string | null;
}

export interface LearningRoutineRecord extends TimestampedRecord {
  project_id: string;
  title: string;
  frequency_type: LearningRoutineFrequency;
  target_count_per_week: number | null;
  standard_action: string | null;
  minimum_action: string | null;
  estimated_minutes: number | null;
  is_active: boolean;
}

export interface LearningRecordRecord extends TimestampedRecord {
  project_id: string;
  stage_id: string | null;
  routine_id: string | null;
  occurred_on: string;
  occurred_at: string;
  duration_min: number | null;
  quantity_value: number | null;
  quantity_unit: string | null;
  completion_level: LearningCompletionLevel;
  content: string | null;
  output: string | null;
  difficulty_tags: string[];
  feedback: string | null;
  next_step: string | null;
}

export interface LearningAssessmentRecord extends TimestampedRecord {
  project_id: string;
  stage_id: string | null;
  occurred_on: string;
  assessment_type: LearningAssessmentType;
  title: string;
  content: string | null;
  result: string | null;
  score: number | null;
  score_max: number | null;
  exposed_problems: string | null;
  reflection: string | null;
  proposed_adjustment: string | null;
}

export interface InterestCategoryRecord {
  id: string;
  name: string;
  is_preset: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type GenericRecord = Record<string, unknown>;

export interface BackupData {
  app_meta: AppMetaEntry[];
  profile: ProfileRecord[];
  body_measurements: BodyMeasurementRecord[];
  exercise_records: ExerciseRecord[];
  menstrual_records: MenstrualRecord[];
  body_status_records: BodyStatusRecord[];
  learning_domains: LearningDomainRecord[];
  learning_projects: LearningProjectRecord[];
  learning_path_stages: LearningPathStageRecord[];
  learning_resources: LearningResourceRecord[];
  learning_routines: LearningRoutineRecord[];
  learning_records: LearningRecordRecord[];
  learning_assessments: LearningAssessmentRecord[];
  interest_categories: InterestCategoryRecord[];
  interest_projects: GenericRecord[];
  interest_progress_records: GenericRecord[];
  photos: GenericRecord[];
}

export interface JsonBackup {
  app: "personal-manager";
  backup_version: 1;
  exported_at: string;
  contains_photos: false;
  data: BackupData;
}
