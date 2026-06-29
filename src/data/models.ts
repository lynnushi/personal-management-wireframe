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
  delete_after?: string | null;
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
  status_tags: string[];
  note: string | null;
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
  learning_projects: GenericRecord[];
  learning_records: GenericRecord[];
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
