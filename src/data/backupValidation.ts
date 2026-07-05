import { isBodyWeatherLevel } from "../app/bodyWeather";
import { BackupData, JsonBackup } from "./models";

const BACKUP_ARRAY_KEYS: Array<keyof BackupData> = [
  "app_meta",
  "profile",
  "body_measurements",
  "exercise_records",
  "menstrual_records",
  "body_status_records",
  "learning_domains",
  "learning_projects",
  "learning_path_stages",
  "learning_resources",
  "learning_routines",
  "learning_records",
  "learning_assessments",
  "interest_categories",
  "interest_projects",
  "interest_progress_records",
  "photos",
];

const OPTIONAL_LEARNING_ARRAY_KEYS: Array<keyof BackupData> = [
  "learning_domains",
  "learning_projects",
  "learning_path_stages",
  "learning_resources",
  "learning_routines",
  "learning_records",
  "learning_assessments",
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

  for (const key of OPTIONAL_LEARNING_ARRAY_KEYS) {
    if (!(key in parsed.data)) {
      parsed.data[key] = [];
    }
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
  validateLearningDomains(parsed.data.learning_domains as unknown[]);
  validateLearningProjects(parsed.data.learning_projects as unknown[]);
  validateLearningPathStages(parsed.data.learning_path_stages as unknown[]);
  validateLearningResources(parsed.data.learning_resources as unknown[]);
  validateLearningRoutines(parsed.data.learning_routines as unknown[]);
  validateLearningRecords(parsed.data.learning_records as unknown[]);
  validateLearningAssessments(parsed.data.learning_assessments as unknown[]);
  validateInterestCategories(parsed.data.interest_categories as unknown[]);

  return parsed as unknown as JsonBackup;
}

function validateLearningDomains(records: unknown[]): void {
  for (const record of records) {
    if (!isRecord(record) || typeof record.id !== "string" || typeof record.name !== "string") {
      throw new Error("learning_domains 数据格式不正确。");
    }
    normalizeNullableText(record, "description");
    normalizeDeleteFields(record);
  }
}

function validateLearningProjects(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.domain_id !== "string" ||
      typeof record.title !== "string" ||
      !isLearningProjectStatus(record.status) ||
      typeof record.start_date !== "string"
    ) {
      throw new Error("learning_projects 数据格式不正确。");
    }
    normalizeNullableText(record, "goal");
    normalizeNullableText(record, "current_level");
    normalizeNullableText(record, "target_state");
    normalizeNullableText(record, "motivation");
    normalizeNullableText(record, "target_date");
    normalizeNullableText(record, "constraints");
    normalizeNullableText(record, "preferred_methods");
    normalizeNullableNumber(record, "weekly_time_budget_min");
    normalizeDeleteFields(record);
  }
}

function validateLearningPathStages(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.project_id !== "string" ||
      typeof record.title !== "string" ||
      typeof record.sort_order !== "number" ||
      !isLearningStageStatus(record.status)
    ) {
      throw new Error("learning_path_stages 数据格式不正确。");
    }
    normalizeNullableText(record, "stage_goal");
    normalizeNullableText(record, "completion_criteria");
    normalizeDeleteFields(record);
  }
}

function validateLearningResources(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.project_id !== "string" ||
      typeof record.name !== "string" ||
      !isLearningResourceType(record.resource_type) ||
      !isLearningResourceStatus(record.status)
    ) {
      throw new Error("learning_resources 数据格式不正确。");
    }
    normalizeNullableText(record, "purpose");
    normalizeNullableText(record, "url");
    normalizeNullableText(record, "evaluation");
    normalizeNullableText(record, "note");
    normalizeDeleteFields(record);
  }
}

function validateLearningRoutines(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.project_id !== "string" ||
      typeof record.title !== "string" ||
      !isLearningRoutineFrequency(record.frequency_type) ||
      typeof record.is_active !== "boolean"
    ) {
      throw new Error("learning_routines 数据格式不正确。");
    }
    normalizeNullableText(record, "standard_action");
    normalizeNullableText(record, "minimum_action");
    normalizeNullableNumber(record, "target_count_per_week");
    normalizeNullableNumber(record, "estimated_minutes");
    normalizeDeleteFields(record);
  }
}

function validateLearningRecords(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.project_id !== "string" ||
      typeof record.occurred_on !== "string" ||
      typeof record.occurred_at !== "string" ||
      !isLearningCompletionLevel(record.completion_level)
    ) {
      throw new Error("learning_records 数据格式不正确。");
    }
    normalizeNullableText(record, "stage_id");
    normalizeNullableText(record, "routine_id");
    normalizeNullableNumber(record, "duration_min");
    normalizeNullableNumber(record, "quantity_value");
    normalizeNullableText(record, "quantity_unit");
    normalizeNullableText(record, "content");
    normalizeNullableText(record, "output");
    normalizeNullableText(record, "feedback");
    normalizeNullableText(record, "next_step");
    if (!Array.isArray(record.difficulty_tags)) record.difficulty_tags = [];
    normalizeDeleteFields(record);
  }
}

function validateLearningAssessments(records: unknown[]): void {
  for (const record of records) {
    if (
      !isRecord(record) ||
      typeof record.id !== "string" ||
      typeof record.project_id !== "string" ||
      typeof record.occurred_on !== "string" ||
      typeof record.title !== "string" ||
      !isLearningAssessmentType(record.assessment_type)
    ) {
      throw new Error("learning_assessments 数据格式不正确。");
    }
    normalizeNullableText(record, "stage_id");
    normalizeNullableText(record, "content");
    normalizeNullableText(record, "result");
    normalizeNullableNumber(record, "score");
    normalizeNullableNumber(record, "score_max");
    normalizeNullableText(record, "exposed_problems");
    normalizeNullableText(record, "reflection");
    normalizeNullableText(record, "proposed_adjustment");
    normalizeDeleteFields(record);
  }
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

function normalizeNullableText(record: Record<string, unknown>, key: string): void {
  if (!(key in record)) record[key] = null;
  if (record[key] !== null && typeof record[key] !== "string") {
    throw new Error("学习文本字段格式不正确。");
  }
}

function normalizeNullableNumber(record: Record<string, unknown>, key: string): void {
  if (!(key in record)) record[key] = null;
  if (record[key] !== null && (typeof record[key] !== "number" || !Number.isFinite(record[key]))) {
    throw new Error("学习数字字段格式不正确。");
  }
}

function isLearningProjectStatus(value: unknown): boolean {
  return ["planned", "active", "paused", "completed"].includes(String(value));
}

function isLearningStageStatus(value: unknown): boolean {
  return ["pending", "active", "completed", "skipped"].includes(String(value));
}

function isLearningResourceType(value: unknown): boolean {
  return ["book", "course", "article", "video", "tool", "exercise", "other"].includes(String(value));
}

function isLearningResourceStatus(value: unknown): boolean {
  return ["evaluating", "active", "paused", "completed", "rejected"].includes(String(value));
}

function isLearningRoutineFrequency(value: unknown): boolean {
  return ["daily", "weekdays", "weekly"].includes(String(value));
}

function isLearningCompletionLevel(value: unknown): boolean {
  return ["minimum", "standard", "extra", "freeform"].includes(String(value));
}

function isLearningAssessmentType(value: unknown): boolean {
  return [
    "test",
    "recall",
    "explanation",
    "writing",
    "speaking",
    "practical_task",
    "simulation",
    "other",
  ].includes(String(value));
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
