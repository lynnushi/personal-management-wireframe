import { BodyWeatherLevel } from "./bodyWeather";

export interface LocalEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AppMetadata {
  schema_version: number;
  installed_at: string | null;
  last_backup_at: string | null;
  interest_category_count: number;
}

export interface ProfileSummary {
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

export interface ProfileInput {
  height_cm: number | null;
}

export interface BodyMeasurementInput {
  occurred_on: string;
  occurred_time: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  skeletal_muscle_kg: number | null;
  source: string | null;
  condition: string | null;
  note: string | null;
}

export interface BodyMeasurementSummary extends LocalEntity {
  occurred_on: string;
  occurred_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  skeletal_muscle_kg: number | null;
  source: string | null;
  condition: string | null;
  note: string | null;
}

export interface ExerciseInput {
  occurred_on: string;
  occurred_time: string;
  exercise_type: string;
  duration_min: number | null;
  distance_km: number | null;
  intensity: string | null;
  content: string | null;
  body_feeling: string | null;
  note: string | null;
}

export interface ExerciseSummary extends LocalEntity {
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

export interface MenstrualInput {
  occurred_on: string;
  event_type: "start" | "end";
  flow: string | null;
  symptoms: string[];
  note: string | null;
  confirm_duplicate_start?: boolean;
}

export interface MenstrualSummary extends LocalEntity {
  occurred_on: string;
  event_type: "start" | "end";
  flow: string | null;
  symptoms: string[];
  note: string | null;
}

export interface BodyWeatherInput {
  occurred_on: string;
  weather_level: BodyWeatherLevel;
  status_tags: string[];
  note: string | null;
}

export interface BodyStatusSummary extends LocalEntity {
  occurred_on: string;
  occurred_at: string;
  weather_level: BodyWeatherLevel | null;
  status_tags: string[];
  note: string | null;
}

export type BodyRecordType = "measurement" | "exercise" | "menstrual" | "weather";

export type BodyHistoryItem =
  | { type: "measurement"; occurred_on: string; occurred_at: string; item: BodyMeasurementSummary }
  | { type: "exercise"; occurred_on: string; occurred_at: string; item: ExerciseSummary }
  | { type: "menstrual"; occurred_on: string; occurred_at: string; item: MenstrualSummary }
  | { type: "status"; occurred_on: string; occurred_at: string; item: BodyStatusSummary };

export interface BodyOverview {
  measurements: BodyMeasurementSummary[];
  exercises: ExerciseSummary[];
  menstrualRecords: MenstrualSummary[];
  menstrualContextRecords: MenstrualSummary[];
  statuses: BodyStatusSummary[];
  history: BodyHistoryItem[];
  exerciseTypes: string[];
  hasMultipleMeasurementSources: boolean;
}

export interface BodyDataBounds {
  earliestMeasurementDate: string | null;
  earliestBodyRecordDate: string | null;
}

export type LearningRangeKey = "week" | "month" | "30d" | "year" | "all";
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

export interface LearningDomainSummary extends LocalEntity {
  delete_after: string | null;
  name: string;
  description: string | null;
}

export interface LearningProjectSummary extends LocalEntity {
  delete_after: string | null;
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

export interface LearningPathStageSummary extends LocalEntity {
  delete_after: string | null;
  project_id: string;
  sort_order: number;
  title: string;
  stage_goal: string | null;
  completion_criteria: string | null;
  status: LearningStageStatus;
}

export interface LearningResourceSummary extends LocalEntity {
  delete_after: string | null;
  project_id: string;
  name: string;
  resource_type: LearningResourceType;
  purpose: string | null;
  url: string | null;
  status: LearningResourceStatus;
  evaluation: string | null;
  note: string | null;
}

export interface LearningRoutineSummary extends LocalEntity {
  delete_after: string | null;
  project_id: string;
  title: string;
  frequency_type: LearningRoutineFrequency;
  target_count_per_week: number | null;
  standard_action: string | null;
  minimum_action: string | null;
  estimated_minutes: number | null;
  is_active: boolean;
}

export interface LearningRecordSummary extends LocalEntity {
  delete_after: string | null;
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

export interface LearningAssessmentSummary extends LocalEntity {
  delete_after: string | null;
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

export interface LearningStats {
  studyDays: number;
  totalMinutes: number;
  recordCount: number;
  activeProjectCount: number;
  assessmentCount: number;
}

export interface LearningDomainOverview {
  domain: LearningDomainSummary;
  activeProjectCount: number;
  monthMinutes: number;
  recentStudyDate: string | null;
}

export interface LearningProjectCard {
  project: LearningProjectSummary;
  domain: LearningDomainSummary | null;
  activeStage: LearningPathStageSummary | null;
  monthMinutes: number;
  recentStudyDate: string | null;
  recentNextStep: string | null;
  recentAssessmentDate: string | null;
}

export interface LearningRecordListItem {
  record: LearningRecordSummary;
  project: LearningProjectSummary | null;
}

export interface LearningAssessmentListItem {
  assessment: LearningAssessmentSummary;
  project: LearningProjectSummary | null;
}

export interface LearningOverview {
  stats: LearningStats;
  domains: LearningDomainOverview[];
  projects: LearningProjectCard[];
  recentRecords: LearningRecordListItem[];
  recentAssessments: LearningAssessmentListItem[];
}

export interface LearningProjectDetail {
  project: LearningProjectSummary;
  domain: LearningDomainSummary | null;
  domains: LearningDomainSummary[];
  stages: LearningPathStageSummary[];
  resources: LearningResourceSummary[];
  routines: LearningRoutineSummary[];
  records: LearningRecordSummary[];
  assessments: LearningAssessmentSummary[];
}

export type LearningRecordType =
  | "domain"
  | "project"
  | "stage"
  | "resource"
  | "routine"
  | "record"
  | "assessment";

export interface LearningDomainInput {
  id?: string;
  name: string;
  description: string | null;
}

export interface LearningProjectInput {
  id?: string;
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

export interface LearningStageInput {
  id?: string;
  project_id: string;
  title: string;
  stage_goal: string | null;
  completion_criteria: string | null;
  status: LearningStageStatus;
}

export interface LearningResourceInput {
  id?: string;
  project_id: string;
  name: string;
  resource_type: LearningResourceType;
  purpose: string | null;
  url: string | null;
  status: LearningResourceStatus;
  evaluation: string | null;
  note: string | null;
}

export interface LearningRoutineInput {
  id?: string;
  project_id: string;
  title: string;
  frequency_type: LearningRoutineFrequency;
  target_count_per_week: number | null;
  standard_action: string | null;
  minimum_action: string | null;
  estimated_minutes: number | null;
  is_active: boolean;
}

export interface LearningRecordInput {
  id?: string;
  project_id: string;
  stage_id: string | null;
  routine_id: string | null;
  occurred_on: string;
  occurred_time: string;
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

export interface LearningAssessmentInput {
  id?: string;
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

export interface DataAccessPort {
  initialize(): Promise<void>;
  getMetadata(): Promise<AppMetadata>;
  getProfile(): Promise<ProfileSummary>;
  updateProfile(input: ProfileInput): Promise<void>;
  exportJsonBackup(): Promise<Blob>;
  importJsonBackup(file: File): Promise<void>;
  createBodyMeasurement(input: BodyMeasurementInput): Promise<void>;
  listBodyMeasurementsByDate(date: string): Promise<BodyMeasurementSummary[]>;
  createExerciseRecord(input: ExerciseInput): Promise<void>;
  createMenstrualRecord(input: MenstrualInput): Promise<void>;
  getBodyWeatherByDate(date: string): Promise<BodyStatusSummary | null>;
  saveBodyWeather(input: BodyWeatherInput): Promise<"created" | "updated">;
  listBodyWeatherInRange(startDate: string, endDate: string): Promise<BodyStatusSummary[]>;
  listMenstrualRecordsForRange(startDate: string, endDate: string): Promise<MenstrualSummary[]>;
  softDeleteBodyRecord(type: BodyRecordType, id: string): Promise<void>;
  restoreBodyRecord(type: BodyRecordType, id: string): Promise<void>;
  getBodyDataBounds(): Promise<BodyDataBounds>;
  getBodyOverview(startDate: string, endDate: string): Promise<BodyOverview>;
  listBodyHistoryByDate(date: string): Promise<BodyHistoryItem[]>;
  getLearningOverview(range: LearningRangeKey): Promise<LearningOverview>;
  getLearningProjectDetail(projectId: string): Promise<LearningProjectDetail | null>;
  saveLearningDomain(input: LearningDomainInput): Promise<string>;
  saveLearningProject(input: LearningProjectInput): Promise<string>;
  saveLearningStage(input: LearningStageInput): Promise<string>;
  moveLearningStage(stageId: string, direction: "up" | "down"): Promise<void>;
  saveLearningResource(input: LearningResourceInput): Promise<string>;
  saveLearningRoutine(input: LearningRoutineInput): Promise<string>;
  saveLearningRecord(input: LearningRecordInput): Promise<string>;
  saveLearningAssessment(input: LearningAssessmentInput): Promise<string>;
  softDeleteLearningRecord(type: LearningRecordType, id: string): Promise<void>;
  restoreLearningRecord(type: LearningRecordType, id: string): Promise<void>;
  generateLearningAiPrompt(projectId: string): Promise<string>;
}

export interface ImageVariantInput {
  photoId: string;
  variant: "thumbnail" | "display";
  blob: Blob;
}

export interface ImageStoragePort {
  saveVariant(input: ImageVariantInput): Promise<void>;
  readVariant(photoId: string, variant: ImageVariantInput["variant"]): Promise<Blob | null>;
  deletePhoto(photoId: string): Promise<void>;
}

export const SCHEMA_VERSION = 3;
