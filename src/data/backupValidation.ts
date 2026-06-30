import { isBodyWeatherLevel } from "../app/bodyWeather";
import { BackupData, JsonBackup } from "./models";

const BACKUP_ARRAY_KEYS: Array<keyof BackupData> = [
  "app_meta",
  "profile",
  "body_measurements",
  "exercise_records",
  "menstrual_records",
  "body_status_records",
  "learning_projects",
  "learning_records",
  "interest_categories",
  "interest_projects",
  "interest_progress_records",
  "photos",
];

export function parseJsonBackupText(text: string): JsonBackup {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("备份文件不是有效的 JSON。");
  }

  if (!isRecord(parsed)) {
    throw new Error("备份文件格式不正确。");
  }

  if (parsed.app !== "personal-manager" || parsed.backup_version !== 1) {
    throw new Error("备份文件版本不受支持。");
  }

  if (typeof parsed.exported_at !== "string") {
    throw new Error("备份文件缺少导出时间。");
  }

  if (parsed.contains_photos !== false) {
    throw new Error("第二阶段只支持不含图片文件的 JSON 备份。");
  }

  if (!isRecord(parsed.data)) {
    throw new Error("备份文件缺少数据内容。");
  }

  for (const key of BACKUP_ARRAY_KEYS) {
    if (!Array.isArray(parsed.data[key])) {
      throw new Error(`备份文件缺少 ${key} 数据。`);
    }
  }

  validateAppMeta(parsed.data.app_meta as unknown[]);
  validateProfile(parsed.data.profile as unknown[]);
  validateBodyMeasurements(parsed.data.body_measurements as unknown[]);
  validateExerciseRecords(parsed.data.exercise_records as unknown[]);
  validateMenstrualRecords(parsed.data.menstrual_records as unknown[]);
  validateBodyStatusRecords(parsed.data.body_status_records as unknown[]);
  validateInterestCategories(parsed.data.interest_categories as unknown[]);

  return parsed as unknown as JsonBackup;
}

function validateExerciseRecords(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.occurred_on !== "string" ||
      typeof record.occurred_at !== "string" ||
      typeof record.exercise_type !== "string"
    ) {
      throw new Error("exercise_records 数据格式不正确。");
    }
    normalizeDeleteFields(record);
  }
}

function validateMenstrualRecords(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.occurred_on !== "string" ||
      (record.event_type !== "start" && record.event_type !== "end")
    ) {
      throw new Error("menstrual_records 数据格式不正确。");
    }
    normalizeDeleteFields(record);
  }
}

function validateBodyStatusRecords(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.occurred_on !== "string" ||
      typeof record.occurred_at !== "string"
    ) {
      throw new Error("body_status_records 数据格式不正确。");
    }
    if (!("weather_level" in record)) {
      record.weather_level = null;
    }
    if (record.weather_level !== null && !isBodyWeatherLevel(record.weather_level)) {
      throw new Error("body_status_records 天气等级不正确。");
    }
    if (!Array.isArray(record.status_tags)) {
      record.status_tags = [];
    }
    normalizeDeleteFields(record);
  }
}

function validateBodyMeasurements(records: unknown[]): void {
  for (const measurement of records) {
    if (
      !isRecord(measurement) ||
      typeof measurement.id !== "string" ||
      typeof measurement.occurred_on !== "string" ||
      typeof measurement.occurred_at !== "string"
    ) {
      throw new Error("body_measurements 数据格式不正确。");
    }
    normalizeDeleteFields(measurement);
  }
}

function validateAppMeta(entries: unknown[]): void {
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.key !== "string") {
      throw new Error("app_meta 数据格式不正确。");
    }
  }
}

function validateProfile(records: unknown[]): void {
  if (records.length > 1) {
    throw new Error("profile 数据只能包含一条本地资料。");
  }

  for (const profile of records) {
    if (!isRecord(profile) || typeof profile.id !== "string") {
      throw new Error("profile 数据格式不正确。");
    }
    if (!("height_cm" in profile)) {
      profile.height_cm = null;
    }
    if (
      profile.height_cm !== null &&
      (typeof profile.height_cm !== "number" ||
        !Number.isFinite(profile.height_cm) ||
        profile.height_cm <= 0)
    ) {
      throw new Error("profile 身高数据格式不正确。");
    }
  }
}

function validateInterestCategories(records: unknown[]): void {
  for (const category of records) {
    if (
      !isRecord(category) ||
      typeof category.id !== "string" ||
      typeof category.name !== "string" ||
      typeof category.is_preset !== "boolean" ||
      typeof category.sort_order !== "number"
    ) {
      throw new Error("interest_categories 数据格式不正确。");
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDeleteFields(record: Record<string, unknown>): void {
  if (!("deleted_at" in record)) {
    record.deleted_at = null;
  }
  if (!("delete_after" in record)) {
    record.delete_after = null;
  }
  if (record.deleted_at !== null && typeof record.deleted_at !== "string") {
    throw new Error("记录删除时间格式不正确。");
  }
  if (record.delete_after !== null && typeof record.delete_after !== "string") {
    throw new Error("记录清理时间格式不正确。");
  }
}
