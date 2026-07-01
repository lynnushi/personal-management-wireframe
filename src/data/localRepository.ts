import {
  SCHEMA_VERSION,
  AppMetadata,
  BodyDataBounds,
  BodyHistoryItem,
  BodyMeasurementInput,
  BodyMeasurementSummary,
  BodyOverview,
  BodyRecordType,
  BodyStatusSummary,
  BodyWeatherInput,
  DataAccessPort,
  ExerciseInput,
  MenstrualSummary,
  MenstrualInput,
  ProfileInput,
  ProfileSummary,
} from "../app/ports";
import { isBodyWeatherLevel } from "../app/bodyWeather";
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

type BodyDeletableRecord =
  | BodyMeasurementRecord
  | ExerciseRecord
  | MenstrualRecord
  | BodyStatusRecord;

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

  async getProfile(): Promise<ProfileSummary> {
    await this.initialize();
    const profile = await getLocalProfile();
    return profile;
  }

  async updateProfile(input: ProfileInput): Promise<void> {
    await this.initialize();
    validateProfileInput(input);
    const profile = await getLocalProfile();
    await db.profile.update(profile.id, {
      height_cm: input.height_cm,
      updated_at: new Date().toISOString(),
    });
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

  async getBodyWeatherByDate(date: string): Promise<BodyStatusSummary | null> {
    await this.initialize();
    validateDate(date);
    return findBodyWeatherByDate(date);
  }

  async saveBodyWeather(input: BodyWeatherInput): Promise<"created" | "updated"> {
    await this.initialize();
    validateBodyWeatherInput(input);
    const now = new Date().toISOString();
    const existing = await findBodyWeatherByDate(input.occurred_on);
    const normalizedTags = normalizeTags(input.status_tags);
    if (existing) {
      await db.body_status_records.update(existing.id, {
        occurred_at: createOccurredAt(input.occurred_on, formatLocalTime(new Date())),
        weather_level: input.weather_level,
        status_tags: normalizedTags,
        note: normalizeOptionalText(input.note),
        updated_at: now,
      });
      return "updated";
    }

    const record: BodyStatusRecord = {
      id: createLocalId(),
      occurred_on: input.occurred_on,
      occurred_at: createOccurredAt(input.occurred_on, formatLocalTime(new Date())),
      weather_level: input.weather_level,
      status_tags: normalizedTags,
      note: normalizeOptionalText(input.note),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    };
    await db.body_status_records.add(record);
    return "created";
  }

  async listBodyWeatherInRange(startDate: string, endDate: string): Promise<BodyStatusSummary[]> {
    await this.initialize();
    validateDateRange(startDate, endDate);
    return listStatusesInRange(startDate, endDate);
  }

  async listMenstrualRecordsForRange(
    startDate: string,
    endDate: string,
  ): Promise<MenstrualSummary[]> {
    await this.initialize();
    validateDateRange(startDate, endDate);
    return listMenstrualContextForRange(startDate, endDate);
  }

  async softDeleteBodyRecord(type: BodyRecordType, id: string): Promise<void> {
    await this.initialize();
    const record = await getBodyRecordByType(type, id);
    if (!record) {
      throw new Error("要删除的记录不存在。");
    }
    if (record.deleted_at) {
      throw new Error("该记录已经删除。");
    }
    const deletedAt = new Date().toISOString();
    await updateBodyRecordByType(type, id, {
      deleted_at: deletedAt,
      updated_at: deletedAt,
      delete_after: addDaysIso(deletedAt, 30),
    });
  }

  async restoreBodyRecord(type: BodyRecordType, id: string): Promise<void> {
    await this.initialize();
    const record = await getBodyRecordByType(type, id);
    if (!record) {
      throw new Error("要恢复的记录不存在。");
    }
    if (type === "weather" && record.deleted_at) {
      const existing = await findBodyWeatherByDate(record.occurred_on);
      if (existing && existing.id !== id) {
        throw new Error("该日期已有新的身体天气记录，不能直接恢复旧记录。");
      }
    }
    await updateBodyRecordByType(type, id, {
      deleted_at: null,
      delete_after: null,
      updated_at: new Date().toISOString(),
    });
  }

  async getBodyDataBounds(): Promise<BodyDataBounds> {
    await this.initialize();
    const [measurements, exercises, menstrualRecords, statuses] = await Promise.all([
      db.body_measurements.filter((item) => !item.deleted_at).toArray(),
      db.exercise_records.filter((item) => !item.deleted_at).toArray(),
      db.menstrual_records.filter((item) => !item.deleted_at).toArray(),
      db.body_status_records.filter((item) => !item.deleted_at).toArray(),
    ]);
    return {
      earliestMeasurementDate: getEarliestOccurredOn(measurements),
      earliestBodyRecordDate: getEarliestOccurredOn([
        ...measurements,
        ...exercises,
        ...menstrualRecords,
        ...statuses,
      ]),
    };
  }

  async getBodyOverview(startDate: string, endDate: string): Promise<BodyOverview> {
    await this.initialize();
    const [measurements, exercises, menstrualRecords, menstrualContextRecords, statuses] = await Promise.all([
      listMeasurementsInRange(startDate, endDate),
      listExercisesInRange(startDate, endDate),
      listMenstrualInRange(startDate, endDate),
      listMenstrualContextForRange(startDate, endDate),
      listStatusesInRange(startDate, endDate),
    ]);

    const history = createHistory(measurements, exercises, menstrualRecords, statuses);
    const exerciseTypes = Array.from(
      new Set(
        (await db.exercise_records.filter((item) => !item.deleted_at).toArray()).map(
          (item) => item.exercise_type,
        ),
      ),
    ).sort();
    const sources = new Set(measurements.map((item) => item.source).filter(Boolean));

    return {
      measurements,
      exercises,
      menstrualRecords,
      menstrualContextRecords,
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

async function getLocalProfile(): Promise<ProfileRecord> {
  const profile = await db.profile.get("local");
  if (profile) return profile;
  const now = new Date().toISOString();
  const fallback: ProfileRecord = {
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
  await db.profile.put(fallback);
  return fallback;
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

function validateProfileInput(input: ProfileInput): void {
  if (input.height_cm === null) return;
  if (!Number.isFinite(input.height_cm) || input.height_cm <= 0) {
    throw new Error("身高必须大于 0。");
  }
  if (input.height_cm < 50 || input.height_cm > 260) {
    throw new Error("请输入合理的身高，单位为 cm。");
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

function validateBodyWeatherInput(input: BodyWeatherInput): void {
  validateDate(input.occurred_on);
  if (!isBodyWeatherLevel(input.weather_level)) {
    throw new Error("请选择身体天气。");
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

function validateDateRange(startDate: string, endDate: string): void {
  validateDate(startDate);
  validateDate(endDate);
  if (startDate > endDate) {
    throw new Error("开始日期不能晚于结束日期。");
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

function normalizeTags(values: string[]): string[] {
  return Array.from(new Set(values.map((tag) => tag.trim()).filter(Boolean)));
}

async function getBodyRecordByType(type: BodyRecordType, id: string): Promise<BodyDeletableRecord | undefined> {
  if (type === "measurement") return db.body_measurements.get(id);
  if (type === "exercise") return db.exercise_records.get(id);
  if (type === "menstrual") return db.menstrual_records.get(id);
  return db.body_status_records.get(id);
}

async function updateBodyRecordByType(
  type: BodyRecordType,
  id: string,
  changes: Pick<BodyDeletableRecord, "deleted_at" | "updated_at"> & { delete_after: string | null },
): Promise<void> {
  if (type === "measurement") {
    await db.body_measurements.update(id, changes);
    return;
  }
  if (type === "exercise") {
    await db.exercise_records.update(id, changes);
    return;
  }
  if (type === "menstrual") {
    await db.menstrual_records.update(id, changes);
    return;
  }
  await db.body_status_records.update(id, changes);
}

function addDaysIso(value: string, days: number): string {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
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

function formatLocalTime(date: Date): string {
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${hour}:${minute}`;
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

async function listMenstrualContextForRange(
  startDate: string,
  endDate: string,
): Promise<MenstrualRecord[]> {
  const records = (await db.menstrual_records.filter((item) => !item.deleted_at).toArray()).sort(
    (a, b) => a.occurred_on.localeCompare(b.occurred_on),
  );
  const context = new Map<string, MenstrualRecord>();
  let latestOpenStartBeforeRange: MenstrualRecord | null = null;
  let shouldIncludeUntilNextEnd = false;

  for (const record of records) {
    if (record.occurred_on < startDate) {
      if (record.event_type === "start") latestOpenStartBeforeRange = record;
      if (record.event_type === "end" && latestOpenStartBeforeRange) {
        latestOpenStartBeforeRange = null;
      }
      continue;
    }

    if (record.occurred_on <= endDate) {
      context.set(record.id, record);
      if (record.event_type === "start") shouldIncludeUntilNextEnd = true;
      if (record.event_type === "end") shouldIncludeUntilNextEnd = false;
      continue;
    }

    if (shouldIncludeUntilNextEnd && record.event_type === "end") {
      context.set(record.id, record);
      break;
    }
  }

  if (latestOpenStartBeforeRange) {
    context.set(latestOpenStartBeforeRange.id, latestOpenStartBeforeRange);
  }

  return Array.from(context.values()).sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
}

async function listStatusesInRange(startDate: string, endDate: string): Promise<BodyStatusRecord[]> {
  return db.body_status_records
    .where("occurred_on")
    .between(startDate, endDate, true, true)
    .filter((item) => !item.deleted_at)
    .sortBy("occurred_at");
}

function getEarliestOccurredOn(records: Array<{ occurred_on: string }>): string | null {
  return records.reduce<string | null>((earliest, record) => {
    if (!earliest || record.occurred_on < earliest) return record.occurred_on;
    return earliest;
  }, null);
}

async function findBodyWeatherByDate(date: string): Promise<BodyStatusRecord | null> {
  const records = await db.body_status_records
    .where("occurred_on")
    .equals(date)
    .filter((item) => !item.deleted_at)
    .sortBy("updated_at");
  return records.reverse()[0] ?? null;
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
