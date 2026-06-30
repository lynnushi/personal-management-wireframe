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
  getBodyOverview(startDate: string, endDate: string): Promise<BodyOverview>;
  listBodyHistoryByDate(date: string): Promise<BodyHistoryItem[]>;
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

export const SCHEMA_VERSION = 2;
