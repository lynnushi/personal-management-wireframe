import {
  SCHEMA_VERSION,
  AppMetadata,
  BodyHistoryItem,
  BodyMeasurementInput,
  BodyMeasurementSummary,
  BodyOverview,
  BodyStatusInput,
  DataAccessPort,
  ExerciseInput,
  MenstrualInput,
} from "../app/ports";
import { parseJsonBackupText } from "./backupValidation";
import { db } from "./localDatabase";
import {
  BackupData,
  BodyMeasurementRecord,
  BodyStatusRecord,
  ExerciseRecord,
  JsonBackup,
  MenstrualRecord,
  ProfileRecord,
} from "./models";
import { createPresetInterestCategories } from "./presetData";

const BACKUP_FILE_MIME = "application/json;charset=utf-8";

class LocalDataRepository implements DataAccessPort {
  async initialize(): Promise<void> {
    const now = new Date().toISOString();

    await db.transaction("rw", db.app_meta, db.profile, db.interest_categories, async () => {
      await putMetaIfMissing("schema_version", SCHEMA_VERSION);
      await putMetaIfMissing("installed_at", now);
      await putMetaIfMissing("last_backup_at", null);

      const profileCount = await db.profile.count();
      if (profileCount === 0) {
        const profile: ProfileRecord = {
          id: "local",
          display_name: null,
          height_cm: null,
          body_goal: null,
          weight_unit: "kg",
          distance_unit: "km",
          duration_unit: "minute",
          created_at: now,
          updated_at: now,
        };
        await db.profile.add(profile);
      }

      const presetCount = await db.interest_categories
        .filter((category) => category.is_preset)
        .count();
      if (presetCount === 0) {
        await db.interest_categories.bulkAdd(createPresetInterestCategories(now));
      }
    });
  }

  async getMetadata(): Promise<AppMetadata> {
    await this.initialize();

    const [schemaVersion, installedAt, lastBackupAt, interestCategoryCount] = await Promise.all([
      getMetaNumber("schema_version", SCHEMA_VERSION),
      getMetaStringOrNull("installed_at"),
      getMetaStringOrNull("last_backup_at"),
      db.interest_categories.filter((category) => !category.deleted_at).count(),
    ]);

    return {
      schema_version: schemaVersion,
      installed_at: installedAt,
      last_backup_at: lastBackupAt,
      interest_category_count: interestCategoryCount,
    };
  }

  async exportJsonBackup(): Promise<Blob> {
    await this.initialize();
    const exportedAt = new Date().toISOString();
    const data = await readBackupData();
    const backup: JsonBackup = {
      app: "personal-manager",
      backup_version: 1,
      exported_at: exportedAt,
      contains_photos: false,
      data,
    };

    await db.app_meta.put({ key: "last_backup_at", value: exportedAt });

    return new Blob([JSON.stringify(backup, null, 2)], { type: BACKUP_FILE_MIME });
  }

  async importJsonBackup(file: File): Promise<void> {
    const text = await file.text();
    const backup = parseJsonBackupText(text);

    await db.transaction(
      "rw",
      [
        db.app_meta,
        db.profile,
        db.body_measurements,
        db.exercise_records,
        db.menstrual_records,
        db.body_status_records,
        db.learning_projects,
        db.learning_records,
        db.interest_categories,
        db.interest_projects,
        db.interest_progress_records,
        db.photos,
        db.photo_blobs,
      ],
      async () => {
        await Promise.all([
          db.app_meta.clear(),
          db.profile.clear(),
          db.body_measurements.clear(),
          db.exercise_records.clear(),
          db.menstrual_records.clear(),
          db.body_status_records.clear(),
          db.learning_projects.clear(),
          db.learning_records.clear(),
          db.interest_categories.clear(),
          db.interest_projects.clear(),
          db.interest_progress_records.clear(),
          db.photos.clear(),
          db.photo_blobs.clear(),
        ]);

        await Promise.all([
          db.app_meta.bulkAdd(backup.data.app_meta),
          db.profile.bulkAdd(backup.data.profile),
          db.body_measurements.bulkAdd(backup.data.body_measurements),
          db.exercise_records.bulkAdd(backup.data.exercise_records),
          db.menstrual_records.bulkAdd(backup.data.menstrual_records),
          db.body_status_records.bulkAdd(backup.data.body_status_records),
          db.learning_projects.bulkAdd(backup.data.learning_projects),
          db.learning_records.bulkAdd(backup.data.learning_records),
          db.interest_categories.bulkAdd(backup.data.interest_categories),
          db.interest_projects.bulkAdd(backup.data.interest_projects),
          db.interest_progress_records.bulkAdd(backup.data.interest_progress_records),
          db.photos.bulkAdd(backup.data.photos),
        ]);

        await putRequiredMetaAfterImport(backup.exported_at);
      },
    );

    await this.initialize();
  }

  async createBodyMeasurement(input: BodyMeasurementInput): Promise<void> {
    await this.initialize();
    validateBodyMeasurementInput(input);

    const now = new Date().toISOString();
    const record: BodyMeasurementRecord = {
      id: createLocalId(),
      occurred_on: input.occurred_on,
      occurred_at: createOccurredAt(input.occurred_on, input.occurred_time),
      weight_kg: input.weight_kg,
      body_fat_percent: input.body_fat_percent,
      skeletal_muscle_kg: input.skeletal_muscle_kg,
      source: normalizeOptionalText(input.source),
      condition: normalizeOptionalText(input.condition),
      note: normalizeOptionalText(input.note),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    };

    await db.body_measurements.add(record);
  }

  async listBodyMeasurementsByDate(date: string): Promise<BodyMeasurementSummary[]> {
    await this.initialize();
    const records = await db.body_measurements
      .where("occurred_on")
      .equals(date)
      .filter((measurement) => !measurement.deleted_at)
      .sortBy("occurred_at");
    return records.reverse();
  }

  async createExerciseRecord(input: ExerciseInput): Promise<void> {
    await this.initialize();
    validateExerciseInput(input);
    const now = new Date().toISOString();
    const record: ExerciseRecord = {
      id: createLocalId(),
      occurred_on: input.occurred_on,
      occurred_at: createOccurredAt(input.occurred_on, input.occurred_time),
      exercise_type: input.exercise_type.trim(),
      duration_min: input.duration_min,
      distance_km: input.distance_km,
      intensity: normalizeOptionalText(input.intensity),
      content: normalizeOptionalText(input.content),
      body_feeling: normalizeOptionalText(input.body_feeling),
      note: normalizeOptionalText(input.note),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    };
    await db.exercise_records.add(record);
  }

  async createMenstrualRecord(input: MenstrualInput): Promise<void> {
    await this.initialize();
    await validateMenstrualInput(input);
    const now = new Date().toISOString();
    const record: MenstrualRecord = {
      id: createLocalId(),
      occurred_on: input.occurred_on,
      event_type: input.event_type,
      flow: normalizeOptionalText(input.flow),
      symptoms: input.symptoms.map((symptom) => symptom.trim()).filter(Boolean),
      note: normalizeOptionalText(input.note),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    };
    await db.menstrual_records.add(record);
  }

  async createBodyStatusRecord(input: BodyStatusInput): Promise<void> {
    await this.initialize();
    validateBodyStatusInput(input);
    const now = new Date().toISOString();
    const record: BodyStatusRecord = {
      id: createLocalId(),
      occurred_on: input.occurred_on,
      occurred_at: createOccurredAt(input.occurred_on, input.occurred_time),
      status_tags: input.status_tags.map((tag) => tag.trim()).filter(Boolean),
      note: normalizeOptionalText(input.note),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    };
    await db.body_status_records.add(record);
  }

  async getBodyOverview(startDate: string, endDate: string): Promise<BodyOverview> {
    await this.initialize();
    const [measurements, exercises, menstrualRecords, statuses] = await Promise.all([
      listMeasurementsInRange(startDate, endDate),
      listExercisesInRange(startDate, endDate),
      listMenstrualInRange(startDate, endDate),
      listStatusesInRange(startDate, endDate),
    ]);

    const history = createHistory(measurements, exercises, menstrualRecords, statuses);
    const exerciseTypes = Array.from(new Set((await db.exercise_records.toArray()).map((item) => item.exercise_type))).sort();
    const sources = new Set(measurements.map((item) => item.source).filter(Boolean));

    return {
      measurements,
      exercises,
      menstrualRecords,
      statuses,
      history,
      exerciseTypes,
      hasMultipleMeasurementSources: sources.size > 1,
    };
  }

  async listBodyHistoryByDate(date: string): Promise<BodyHistoryItem[]> {
    await this.initialize();
    const [measurements, exercises, menstrualRecords, statuses] = await Promise.all([
      listMeasurementsInRange(date, date),
      listExercisesInRange(date, date),
      listMenstrualInRange(date, date),
      listStatusesInRange(date, date),
    ]);
    return createHistory(measurements, exercises, menstrualRecords, statuses);
  }
}

export const localDataRepository: DataAccessPort = new LocalDataRepository();

async function readBackupData(): Promise<BackupData> {
  const [
    appMeta,
    profile,
    bodyMeasurements,
    exerciseRecords,
    menstrualRecords,
    bodyStatusRecords,
    learningProjects,
    learningRecords,
    interestCategories,
    interestProjects,
    interestProgressRecords,
    photos,
  ] = await Promise.all([
    db.app_meta.toArray(),
    db.profile.toArray(),
    db.body_measurements.toArray(),
    db.exercise_records.toArray(),
    db.menstrual_records.toArray(),
    db.body_status_records.toArray(),
    db.learning_projects.toArray(),
    db.learning_records.toArray(),
    db.interest_categories.toArray(),
    db.interest_projects.toArray(),
    db.interest_progress_records.toArray(),
    db.photos.toArray(),
  ]);

  return {
    app_meta: appMeta,
    profile,
    body_measurements: bodyMeasurements,
    exercise_records: exerciseRecords,
    menstrual_records: menstrualRecords,
    body_status_records: bodyStatusRecords,
    learning_projects: learningProjects,
    learning_records: learningRecords,
    interest_categories: interestCategories,
    interest_projects: interestProjects,
    interest_progress_records: interestProgressRecords,
    photos,
  };
}

async function putRequiredMetaAfterImport(importedAt: string): Promise<void> {
  await db.app_meta.put({ key: "schema_version", value: SCHEMA_VERSION });
  await db.app_meta.put({ key: "last_imported_backup_at", value: importedAt });
}

async function putMetaIfMissing(key: string, value: unknown): Promise<void> {
  const existing = await db.app_meta.get(key);
  if (!existing) {
    await db.app_meta.put({ key, value });
  }
}

async function getMetaStringOrNull(key: string): Promise<string | null> {
  const entry = await db.app_meta.get(key);
  return typeof entry?.value === "string" ? entry.value : null;
}

async function getMetaNumber(key: string, fallback: number): Promise<number> {
  const entry = await db.app_meta.get(key);
  return typeof entry?.value === "number" ? entry.value : fallback;
}

function validateBodyMeasurementInput(input: BodyMeasurementInput): void {
  validateDate(input.occurred_on);

  if (
    input.weight_kg === null &&
    input.body_fat_percent === null &&
    input.skeletal_muscle_kg === null
  ) {
    throw new Error("体重、体脂率、骨骼肌量至少填写一项。");
  }
}

function validateExerciseInput(input: ExerciseInput): void {
  validateDate(input.occurred_on);
  if (!input.exercise_type.trim()) {
    throw new Error("请选择或输入运动类型。");
  }
}

async function validateMenstrualInput(input: MenstrualInput): Promise<void> {
  validateDate(input.occurred_on);
  if (input.event_type !== "start" && input.event_type !== "end") {
    throw new Error("请选择月经开始或结束。");
  }
  if (input.event_type === "start" && !input.confirm_duplicate_start) {
    const openStart = await findOpenMenstrualStart();
    if (openStart) {
      throw new Error("当前存在未结束的开始记录，请确认是否开启新周期。");
    }
  }
}

function validateBodyStatusInput(input: BodyStatusInput): void {
  validateDate(input.occurred_on);
  const hasTags = input.status_tags.some((tag) => tag.trim().length > 0);
  const hasNote = Boolean(normalizeOptionalText(input.note));
  if (!hasTags && !hasNote) {
    throw new Error("状态标签或备注至少填写一项。");
  }
}

function validateDate(date: string): void {
  if (!date) {
    throw new Error("请选择记录日期。");
  }
  if (date > getTodayDateString()) {
    throw new Error("不能保存未来日期的记录。");
  }
}

function createOccurredAt(date: string, time: string): string {
  const normalizedTime = time || "00:00";
  return new Date(`${date}T${normalizedTime}:00`).toISOString();
}

function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

function normalizeOptionalText(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function listMeasurementsInRange(
  startDate: string,
  endDate: string,
): Promise<BodyMeasurementSummary[]> {
  return db.body_measurements
    .where("occurred_on")
    .between(startDate, endDate, true, true)
    .filter((item) => !item.deleted_at)
    .sortBy("occurred_at");
}

async function listExercisesInRange(startDate: string, endDate: string): Promise<ExerciseRecord[]> {
  return db.exercise_records
    .where("occurred_on")
    .between(startDate, endDate, true, true)
    .filter((item) => !item.deleted_at)
    .sortBy("occurred_at");
}

async function listMenstrualInRange(startDate: string, endDate: string): Promise<MenstrualRecord[]> {
  return db.menstrual_records
    .where("occurred_on")
    .between(startDate, endDate, true, true)
    .filter((item) => !item.deleted_at)
    .sortBy("occurred_on");
}

async function listStatusesInRange(startDate: string, endDate: string): Promise<BodyStatusRecord[]> {
  return db.body_status_records
    .where("occurred_on")
    .between(startDate, endDate, true, true)
    .filter((item) => !item.deleted_at)
    .sortBy("occurred_at");
}

function createHistory(
  measurements: BodyMeasurementSummary[],
  exercises: ExerciseRecord[],
  menstrualRecords: MenstrualRecord[],
  statuses: BodyStatusRecord[],
): BodyHistoryItem[] {
  return [
    ...measurements.map((item) => ({
      type: "measurement" as const,
      occurred_on: item.occurred_on,
      occurred_at: item.occurred_at,
      item,
    })),
    ...exercises.map((item) => ({
      type: "exercise" as const,
      occurred_on: item.occurred_on,
      occurred_at: item.occurred_at,
      item,
    })),
    ...menstrualRecords.map((item) => ({
      type: "menstrual" as const,
      occurred_on: item.occurred_on,
      occurred_at: `${item.occurred_on}T00:00:00.000Z`,
      item,
    })),
    ...statuses.map((item) => ({
      type: "status" as const,
      occurred_on: item.occurred_on,
      occurred_at: item.occurred_at,
      item,
    })),
  ].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

async function findOpenMenstrualStart(): Promise<MenstrualRecord | null> {
  const records = (await db.menstrual_records.filter((item) => !item.deleted_at).toArray()).sort((a, b) =>
    a.occurred_on.localeCompare(b.occurred_on),
  );
  let openStart: MenstrualRecord | null = null;
  for (const record of records) {
    if (record.event_type === "start") {
      openStart = record;
    } else if (record.event_type === "end" && openStart) {
      openStart = null;
    }
  }
  return openStart;
}
