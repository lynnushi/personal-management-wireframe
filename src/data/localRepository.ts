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
  LearningAssessmentInput,
  LearningAssessmentSummary,
  LearningDomainInput,
  LearningDomainOverview,
  LearningDomainSummary,
  LearningOverview,
  LearningPathStageSummary,
  LearningProjectCard,
  LearningProjectDetail,
  LearningProjectInput,
  LearningProjectStatus,
  LearningProjectSummary,
  LearningRangeKey,
  LearningAssessmentType,
  LearningCompletionLevel,
  LearningRecordInput,
  LearningRecordSummary,
  LearningRecordType,
  LearningResourceInput,
  LearningResourceStatus,
  LearningResourceSummary,
  LearningResourceType,
  LearningRoutineFrequency,
  LearningRoutineInput,
  LearningRoutineSummary,
  LearningStageStatus,
  LearningStageInput,
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
  LearningAssessmentRecord,
  LearningDomainRecord,
  LearningPathStageRecord,
  LearningProjectRecord,
  LearningRecordRecord,
  LearningResourceRecord,
  LearningRoutineRecord,
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

type LearningDeletableRecord =
  | LearningDomainRecord
  | LearningProjectRecord
  | LearningPathStageRecord
  | LearningResourceRecord
  | LearningRoutineRecord
  | LearningRecordRecord
  | LearningAssessmentRecord;

class LocalDataRepository implements DataAccessPort {
  async initialize(): Promise<void> {
    const now = new Date().toISOString();

    await db.transaction("rw", db.app_meta, db.profile, db.interest_categories, async () => {
      await db.app_meta.put({ key: "schema_version", value: SCHEMA_VERSION });
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
        db.learning_domains,
        db.learning_projects,
        db.learning_path_stages,
        db.learning_resources,
        db.learning_routines,
        db.learning_records,
        db.learning_assessments,
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
          db.learning_domains.clear(),
          db.learning_projects.clear(),
          db.learning_path_stages.clear(),
          db.learning_resources.clear(),
          db.learning_routines.clear(),
          db.learning_records.clear(),
          db.learning_assessments.clear(),
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
          db.learning_domains.bulkAdd(backup.data.learning_domains),
          db.learning_projects.bulkAdd(backup.data.learning_projects),
          db.learning_path_stages.bulkAdd(backup.data.learning_path_stages),
          db.learning_resources.bulkAdd(backup.data.learning_resources),
          db.learning_routines.bulkAdd(backup.data.learning_routines),
          db.learning_records.bulkAdd(backup.data.learning_records),
          db.learning_assessments.bulkAdd(backup.data.learning_assessments),
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

  async getLearningOverview(range: LearningRangeKey): Promise<LearningOverview> {
    await this.initialize();
    const bounds = await getLearningRangeBounds(range);
    const [domains, projects, stages, records, assessments] = await Promise.all([
      listLearningDomains(),
      listLearningProjects(),
      listLearningStages(),
      listLearningRecords(),
      listLearningAssessments(),
    ]);
    const rangeRecords = filterLearningRecordsByBounds(records, bounds);
    const rangeAssessments = filterLearningAssessmentsByBounds(assessments, bounds);
    const monthBounds = getLearningFixedRangeBounds("month");
    const monthRecords = filterLearningRecordsByBounds(records, monthBounds);
    const projectById = mapById(projects);
    const domainById = mapById(domains);

    return {
      stats: {
        studyDays: new Set(rangeRecords.map((record) => record.occurred_on)).size,
        totalMinutes: sumMinutes(rangeRecords),
        recordCount: rangeRecords.length,
        activeProjectCount: projects.filter((project) => project.status === "active").length,
        assessmentCount: rangeAssessments.length,
      },
      domains: domains.map((domain) =>
        createDomainOverview(domain, projects, monthRecords, records),
      ),
      projects: projects
        .filter((project) => project.status !== "completed")
        .map((project) =>
          createProjectCard(project, domainById.get(project.domain_id) ?? null, stages, monthRecords, records, assessments),
        )
        .sort(sortProjectCards),
      recentRecords: records.slice(0, 10).map((record) => ({
        record,
        project: projectById.get(record.project_id) ?? null,
      })),
      recentAssessments: assessments.slice(0, 5).map((assessment) => ({
        assessment,
        project: projectById.get(assessment.project_id) ?? null,
      })),
    };
  }

  async getLearningProjectDetail(projectId: string): Promise<LearningProjectDetail | null> {
    await this.initialize();
    const [project, domains, stages, resources, routines, records, assessments] = await Promise.all([
      db.learning_projects.get(projectId),
      listLearningDomains(),
      listLearningStagesByProject(projectId),
      listLearningResourcesByProject(projectId),
      listLearningRoutinesByProject(projectId),
      listLearningRecordsByProject(projectId),
      listLearningAssessmentsByProject(projectId),
    ]);
    if (!project || project.deleted_at) return null;
    const domain = domains.find((item) => item.id === project.domain_id) ?? null;
    return { project, domain, domains, stages, resources, routines, records, assessments };
  }

  async saveLearningDomain(input: LearningDomainInput): Promise<string> {
    await this.initialize();
    validateLearningDomainInput(input);
    const now = new Date().toISOString();
    const id = input.id ?? createLocalId();
    const record: LearningDomainRecord = {
      id,
      name: input.name.trim(),
      description: normalizeOptionalText(input.description),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    };
    if (input.id) {
      await ensureLearningRecordExists("domain", input.id);
      await db.learning_domains.update(input.id, {
        name: record.name,
        description: record.description,
        updated_at: now,
      });
      return input.id;
    }
    await db.learning_domains.add(record);
    return id;
  }

  async saveLearningProject(input: LearningProjectInput): Promise<string> {
    await this.initialize();
    await validateLearningProjectInput(input);
    const now = new Date().toISOString();
    const id = input.id ?? createLocalId();
    const base = normalizeLearningProjectInput(input);
    const record: LearningProjectRecord = {
      id,
      ...base,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    };
    if (input.id) {
      await ensureLearningRecordExists("project", input.id);
      await db.learning_projects.update(input.id, { ...base, updated_at: now });
      return input.id;
    }
    await db.learning_projects.add(record);
    return id;
  }

  async saveLearningStage(input: LearningStageInput): Promise<string> {
    await this.initialize();
    await validateLearningStageInput(input);
    const now = new Date().toISOString();
    const id = input.id ?? createLocalId();
    const base = {
      project_id: input.project_id,
      title: input.title.trim(),
      stage_goal: normalizeOptionalText(input.stage_goal),
      completion_criteria: normalizeOptionalText(input.completion_criteria),
      status: input.status,
    };
    if (input.id) {
      await ensureLearningRecordExists("stage", input.id);
      await db.learning_path_stages.update(input.id, { ...base, updated_at: now });
      return input.id;
    }
    const sortOrder = await getNextLearningStageSortOrder(input.project_id);
    await db.learning_path_stages.add({
      id,
      ...base,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    });
    return id;
  }

  async moveLearningStage(stageId: string, direction: "up" | "down"): Promise<void> {
    await this.initialize();
    const stage = await db.learning_path_stages.get(stageId);
    if (!stage || stage.deleted_at) throw new Error("学习阶段不存在。");
    const stages = await listLearningStagesByProject(stage.project_id);
    const index = stages.findIndex((item) => item.id === stageId);
    const target = stages[direction === "up" ? index - 1 : index + 1];
    if (!target) return;
    const now = new Date().toISOString();
    await db.transaction("rw", db.learning_path_stages, async () => {
      await db.learning_path_stages.update(stage.id, {
        sort_order: target.sort_order,
        updated_at: now,
      });
      await db.learning_path_stages.update(target.id, {
        sort_order: stage.sort_order,
        updated_at: now,
      });
    });
  }

  async saveLearningResource(input: LearningResourceInput): Promise<string> {
    await this.initialize();
    await validateLearningResourceInput(input);
    const now = new Date().toISOString();
    const id = input.id ?? createLocalId();
    const base = {
      project_id: input.project_id,
      name: input.name.trim(),
      resource_type: input.resource_type,
      purpose: normalizeOptionalText(input.purpose),
      url: normalizeOptionalText(input.url),
      status: input.status,
      evaluation: normalizeOptionalText(input.evaluation),
      note: normalizeOptionalText(input.note),
    };
    if (input.id) {
      await ensureLearningRecordExists("resource", input.id);
      await db.learning_resources.update(input.id, { ...base, updated_at: now });
      return input.id;
    }
    await db.learning_resources.add({
      id,
      ...base,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    });
    return id;
  }

  async saveLearningRoutine(input: LearningRoutineInput): Promise<string> {
    await this.initialize();
    await validateLearningRoutineInput(input);
    const now = new Date().toISOString();
    const id = input.id ?? createLocalId();
    const base = {
      project_id: input.project_id,
      title: input.title.trim(),
      frequency_type: input.frequency_type,
      target_count_per_week: input.target_count_per_week,
      standard_action: normalizeOptionalText(input.standard_action),
      minimum_action: normalizeOptionalText(input.minimum_action),
      estimated_minutes: input.estimated_minutes,
      is_active: input.is_active,
    };
    if (input.id) {
      await ensureLearningRecordExists("routine", input.id);
      await db.learning_routines.update(input.id, { ...base, updated_at: now });
      return input.id;
    }
    await db.learning_routines.add({
      id,
      ...base,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    });
    return id;
  }

  async saveLearningRecord(input: LearningRecordInput): Promise<string> {
    await this.initialize();
    await validateLearningRecordInput(input);
    const now = new Date().toISOString();
    const id = input.id ?? createLocalId();
    const base = {
      project_id: input.project_id,
      stage_id: input.stage_id,
      routine_id: input.routine_id,
      occurred_on: input.occurred_on,
      occurred_at: createOccurredAt(input.occurred_on, input.occurred_time),
      duration_min: input.duration_min,
      quantity_value: input.quantity_value,
      quantity_unit: normalizeOptionalText(input.quantity_unit),
      completion_level: input.completion_level,
      content: normalizeOptionalText(input.content),
      output: normalizeOptionalText(input.output),
      difficulty_tags: normalizeTags(input.difficulty_tags),
      feedback: normalizeOptionalText(input.feedback),
      next_step: normalizeOptionalText(input.next_step),
    };
    if (input.id) {
      await ensureLearningRecordExists("record", input.id);
      await db.learning_records.update(input.id, { ...base, updated_at: now });
      return input.id;
    }
    await db.learning_records.add({
      id,
      ...base,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    });
    return id;
  }

  async saveLearningAssessment(input: LearningAssessmentInput): Promise<string> {
    await this.initialize();
    await validateLearningAssessmentInput(input);
    const now = new Date().toISOString();
    const id = input.id ?? createLocalId();
    const base = {
      project_id: input.project_id,
      stage_id: input.stage_id,
      occurred_on: input.occurred_on,
      assessment_type: input.assessment_type,
      title: input.title.trim(),
      content: normalizeOptionalText(input.content),
      result: normalizeOptionalText(input.result),
      score: input.score,
      score_max: input.score_max,
      exposed_problems: normalizeOptionalText(input.exposed_problems),
      reflection: normalizeOptionalText(input.reflection),
      proposed_adjustment: normalizeOptionalText(input.proposed_adjustment),
    };
    if (input.id) {
      await ensureLearningRecordExists("assessment", input.id);
      await db.learning_assessments.update(input.id, { ...base, updated_at: now });
      return input.id;
    }
    await db.learning_assessments.add({
      id,
      ...base,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      delete_after: null,
    });
    return id;
  }

  async softDeleteLearningRecord(type: LearningRecordType, id: string): Promise<void> {
    await this.initialize();
    const record = await getLearningRecordByType(type, id);
    if (!record) throw new Error("要删除的学习记录不存在。");
    if (record.deleted_at) throw new Error("该学习记录已经删除。");
    if (type === "domain") {
      const activeProjects = await db.learning_projects
        .where("domain_id")
        .equals(id)
        .filter((project) => !project.deleted_at)
        .count();
      if (activeProjects > 0) throw new Error("该学习领域下还有项目，不能直接删除。");
    }
    const deletedAt = new Date().toISOString();
    await updateLearningRecordByType(type, id, {
      deleted_at: deletedAt,
      updated_at: deletedAt,
      delete_after: addDaysIso(deletedAt, 30),
    });
  }

  async restoreLearningRecord(type: LearningRecordType, id: string): Promise<void> {
    await this.initialize();
    const record = await getLearningRecordByType(type, id);
    if (!record) throw new Error("要恢复的学习记录不存在。");
    await updateLearningRecordByType(type, id, {
      deleted_at: null,
      delete_after: null,
      updated_at: new Date().toISOString(),
    });
  }

  async generateLearningAiPrompt(projectId: string): Promise<string> {
    await this.initialize();
    const detail = await this.getLearningProjectDetail(projectId);
    if (!detail) throw new Error("学习项目不存在。");
    return createLearningAiPrompt(detail);
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
    learningDomains,
    learningProjects,
    learningPathStages,
    learningResources,
    learningRoutines,
    learningRecords,
    learningAssessments,
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
    db.learning_domains.toArray(),
    db.learning_projects.toArray(),
    db.learning_path_stages.toArray(),
    db.learning_resources.toArray(),
    db.learning_routines.toArray(),
    db.learning_records.toArray(),
    db.learning_assessments.toArray(),
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
    learning_domains: learningDomains,
    learning_projects: learningProjects,
    learning_path_stages: learningPathStages,
    learning_resources: learningResources,
    learning_routines: learningRoutines,
    learning_records: learningRecords,
    learning_assessments: learningAssessments,
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

const LEARNING_PROJECT_STATUSES: LearningProjectStatus[] = ["planned", "active", "paused", "completed"];
const LEARNING_STAGE_STATUSES: LearningStageStatus[] = ["pending", "active", "completed", "skipped"];
const LEARNING_RESOURCE_TYPES: LearningResourceType[] = [
  "book",
  "course",
  "article",
  "video",
  "tool",
  "exercise",
  "other",
];
const LEARNING_RESOURCE_STATUSES: LearningResourceStatus[] = [
  "evaluating",
  "active",
  "paused",
  "completed",
  "rejected",
];
const LEARNING_ROUTINE_FREQUENCIES: LearningRoutineFrequency[] = ["daily", "weekdays", "weekly"];
const LEARNING_COMPLETION_LEVELS: LearningCompletionLevel[] = [
  "minimum",
  "standard",
  "extra",
  "freeform",
];
const LEARNING_ASSESSMENT_TYPES: LearningAssessmentType[] = [
  "test",
  "recall",
  "explanation",
  "writing",
  "speaking",
  "practical_task",
  "simulation",
  "other",
];

function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function validateLearningDomainInput(input: LearningDomainInput): void {
  if (!input.name.trim()) throw new Error("学习领域名称必填。");
}

async function validateLearningProjectInput(input: LearningProjectInput): Promise<void> {
  if (!input.domain_id) throw new Error("请选择学习领域。");
  const domain = await db.learning_domains.get(input.domain_id);
  if (!domain || domain.deleted_at) throw new Error("学习领域不存在。");
  if (!input.title.trim()) throw new Error("学习项目名称必填。");
  if (!isOneOf(input.status, LEARNING_PROJECT_STATUSES)) throw new Error("学习项目状态不正确。");
  if (!input.start_date) throw new Error("请选择开始日期。");
  if (input.target_date && input.target_date < input.start_date) {
    throw new Error("目标日期不能早于开始日期。");
  }
  if (
    input.weekly_time_budget_min !== null &&
    (!Number.isFinite(input.weekly_time_budget_min) || input.weekly_time_budget_min < 0)
  ) {
    throw new Error("每周可投入时间格式不正确。");
  }
}

function normalizeLearningProjectInput(input: LearningProjectInput) {
  return {
    domain_id: input.domain_id,
    title: input.title.trim(),
    status: input.status,
    goal: normalizeOptionalText(input.goal),
    current_level: normalizeOptionalText(input.current_level),
    target_state: normalizeOptionalText(input.target_state),
    motivation: normalizeOptionalText(input.motivation),
    start_date: input.start_date,
    target_date: normalizeOptionalText(input.target_date),
    weekly_time_budget_min: input.weekly_time_budget_min,
    constraints: normalizeOptionalText(input.constraints),
    preferred_methods: normalizeOptionalText(input.preferred_methods),
  };
}

async function validateLearningStageInput(input: LearningStageInput): Promise<void> {
  await ensureLearningProjectExists(input.project_id);
  if (!input.title.trim()) throw new Error("学习阶段标题必填。");
  if (!isOneOf(input.status, LEARNING_STAGE_STATUSES)) throw new Error("学习阶段状态不正确。");
}

async function validateLearningResourceInput(input: LearningResourceInput): Promise<void> {
  await ensureLearningProjectExists(input.project_id);
  if (!input.name.trim()) throw new Error("学习资源名称必填。");
  if (!isOneOf(input.resource_type, LEARNING_RESOURCE_TYPES)) throw new Error("学习资源类型不正确。");
  if (!isOneOf(input.status, LEARNING_RESOURCE_STATUSES)) throw new Error("学习资源状态不正确。");
}

async function validateLearningRoutineInput(input: LearningRoutineInput): Promise<void> {
  await ensureLearningProjectExists(input.project_id);
  if (!input.title.trim()) throw new Error("Daily Routine 名称必填。");
  if (!isOneOf(input.frequency_type, LEARNING_ROUTINE_FREQUENCIES)) {
    throw new Error("Daily Routine 频率不正确。");
  }
  if (!normalizeOptionalText(input.standard_action) && !normalizeOptionalText(input.minimum_action)) {
    throw new Error("标准版本和最低版本至少填写一项。");
  }
  if (
    input.target_count_per_week !== null &&
    (!Number.isFinite(input.target_count_per_week) || input.target_count_per_week <= 0)
  ) {
    throw new Error("每周目标次数必须大于 0。");
  }
  if (
    input.estimated_minutes !== null &&
    (!Number.isFinite(input.estimated_minutes) || input.estimated_minutes < 0)
  ) {
    throw new Error("预计时长格式不正确。");
  }
}

async function validateLearningRecordInput(input: LearningRecordInput): Promise<void> {
  await ensureLearningProjectExists(input.project_id);
  validateDate(input.occurred_on);
  if (!isOneOf(input.completion_level, LEARNING_COMPLETION_LEVELS)) {
    throw new Error("学习完成等级不正确。");
  }
  if (input.stage_id) await ensureLearningStageBelongsToProject(input.stage_id, input.project_id);
  if (input.routine_id) await ensureLearningRoutineBelongsToProject(input.routine_id, input.project_id);
  if (
    input.duration_min === null &&
    input.quantity_value === null &&
    !normalizeOptionalText(input.content)
  ) {
    throw new Error("时长、数量和学习内容至少填写一项。");
  }
  if (input.duration_min !== null && (!Number.isFinite(input.duration_min) || input.duration_min < 0)) {
    throw new Error("学习时长格式不正确。");
  }
  if (
    input.quantity_value !== null &&
    (!Number.isFinite(input.quantity_value) || input.quantity_value < 0)
  ) {
    throw new Error("学习数量格式不正确。");
  }
}

async function validateLearningAssessmentInput(input: LearningAssessmentInput): Promise<void> {
  await ensureLearningProjectExists(input.project_id);
  validateDate(input.occurred_on);
  if (input.stage_id) await ensureLearningStageBelongsToProject(input.stage_id, input.project_id);
  if (!isOneOf(input.assessment_type, LEARNING_ASSESSMENT_TYPES)) {
    throw new Error("检验类型不正确。");
  }
  if (!input.title.trim()) throw new Error("检验标题必填。");
  if (input.score !== null && !Number.isFinite(input.score)) throw new Error("分数格式不正确。");
  if (input.score_max !== null && !Number.isFinite(input.score_max)) {
    throw new Error("满分格式不正确。");
  }
}

async function ensureLearningProjectExists(projectId: string): Promise<LearningProjectRecord> {
  const project = await db.learning_projects.get(projectId);
  if (!project || project.deleted_at) throw new Error("学习项目不存在。");
  return project;
}

async function ensureLearningStageBelongsToProject(stageId: string, projectId: string): Promise<void> {
  const stage = await db.learning_path_stages.get(stageId);
  if (!stage || stage.deleted_at || stage.project_id !== projectId) {
    throw new Error("学习阶段不属于当前项目。");
  }
}

async function ensureLearningRoutineBelongsToProject(routineId: string, projectId: string): Promise<void> {
  const routine = await db.learning_routines.get(routineId);
  if (!routine || routine.deleted_at || routine.project_id !== projectId) {
    throw new Error("Daily Routine 不属于当前项目。");
  }
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

async function getLearningRecordByType(
  type: LearningRecordType,
  id: string,
): Promise<LearningDeletableRecord | undefined> {
  if (type === "domain") return db.learning_domains.get(id);
  if (type === "project") return db.learning_projects.get(id);
  if (type === "stage") return db.learning_path_stages.get(id);
  if (type === "resource") return db.learning_resources.get(id);
  if (type === "routine") return db.learning_routines.get(id);
  if (type === "record") return db.learning_records.get(id);
  return db.learning_assessments.get(id);
}

async function ensureLearningRecordExists(type: LearningRecordType, id: string): Promise<void> {
  const record = await getLearningRecordByType(type, id);
  if (!record || record.deleted_at) throw new Error("要更新的学习记录不存在。");
}

async function updateLearningRecordByType(
  type: LearningRecordType,
  id: string,
  changes: Pick<LearningDeletableRecord, "deleted_at" | "updated_at"> & {
    delete_after: string | null;
  },
): Promise<void> {
  if (type === "domain") {
    await db.learning_domains.update(id, changes);
    return;
  }
  if (type === "project") {
    await db.learning_projects.update(id, changes);
    return;
  }
  if (type === "stage") {
    await db.learning_path_stages.update(id, changes);
    return;
  }
  if (type === "resource") {
    await db.learning_resources.update(id, changes);
    return;
  }
  if (type === "routine") {
    await db.learning_routines.update(id, changes);
    return;
  }
  if (type === "record") {
    await db.learning_records.update(id, changes);
    return;
  }
  await db.learning_assessments.update(id, changes);
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

async function listLearningDomains(): Promise<LearningDomainSummary[]> {
  return db.learning_domains
    .filter((item) => !item.deleted_at)
    .sortBy("name");
}

async function listLearningProjects(): Promise<LearningProjectSummary[]> {
  const projects = await db.learning_projects.filter((item) => !item.deleted_at).toArray();
  return projects.sort((a, b) => {
    const statusOrder = getProjectStatusOrder(a.status) - getProjectStatusOrder(b.status);
    return statusOrder || a.start_date.localeCompare(b.start_date) || a.title.localeCompare(b.title);
  });
}

async function listLearningStages(): Promise<LearningPathStageSummary[]> {
  const stages = await db.learning_path_stages.filter((item) => !item.deleted_at).toArray();
  return stages.sort(sortStages);
}

async function listLearningStagesByProject(projectId: string): Promise<LearningPathStageSummary[]> {
  return db.learning_path_stages
    .where("project_id")
    .equals(projectId)
    .filter((item) => !item.deleted_at)
    .sortBy("sort_order");
}

async function listLearningResourcesByProject(projectId: string): Promise<LearningResourceSummary[]> {
  const resources = await db.learning_resources
    .where("project_id")
    .equals(projectId)
    .filter((item) => !item.deleted_at)
    .toArray();
  return resources.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
}

async function listLearningRoutinesByProject(projectId: string): Promise<LearningRoutineSummary[]> {
  const routines = await db.learning_routines
    .where("project_id")
    .equals(projectId)
    .filter((item) => !item.deleted_at)
    .toArray();
  return routines.sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.title.localeCompare(b.title));
}

async function listLearningRecords(): Promise<LearningRecordSummary[]> {
  const records = await db.learning_records.filter((item) => !item.deleted_at).toArray();
  return records.sort(sortLearningRecordsDesc);
}

async function listLearningRecordsByProject(projectId: string): Promise<LearningRecordSummary[]> {
  const records = await db.learning_records
    .where("project_id")
    .equals(projectId)
    .filter((item) => !item.deleted_at)
    .toArray();
  return records.sort(sortLearningRecordsDesc);
}

async function listLearningAssessments(): Promise<LearningAssessmentSummary[]> {
  const assessments = await db.learning_assessments.filter((item) => !item.deleted_at).toArray();
  return assessments.sort(sortLearningAssessmentsDesc);
}

async function listLearningAssessmentsByProject(projectId: string): Promise<LearningAssessmentSummary[]> {
  const assessments = await db.learning_assessments
    .where("project_id")
    .equals(projectId)
    .filter((item) => !item.deleted_at)
    .toArray();
  return assessments.sort(sortLearningAssessmentsDesc);
}

async function getNextLearningStageSortOrder(projectId: string): Promise<number> {
  const stages = await listLearningStagesByProject(projectId);
  return (stages[stages.length - 1]?.sort_order ?? 0) + 1;
}

function sortStages(a: LearningPathStageSummary, b: LearningPathStageSummary): number {
  return a.project_id.localeCompare(b.project_id) || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
}

function sortLearningRecordsDesc(a: LearningRecordSummary, b: LearningRecordSummary): number {
  return b.occurred_at.localeCompare(a.occurred_at) || b.updated_at.localeCompare(a.updated_at);
}

function sortLearningAssessmentsDesc(
  a: LearningAssessmentSummary,
  b: LearningAssessmentSummary,
): number {
  return b.occurred_on.localeCompare(a.occurred_on) || b.updated_at.localeCompare(a.updated_at);
}

function getProjectStatusOrder(status: LearningProjectStatus): number {
  if (status === "active") return 0;
  if (status === "planned") return 1;
  if (status === "paused") return 2;
  return 3;
}

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

interface LearningDateBounds {
  start: string;
  end: string;
}

async function getLearningRangeBounds(range: LearningRangeKey): Promise<LearningDateBounds | null> {
  if (range !== "all") return getLearningFixedRangeBounds(range);
  const [records, assessments] = await Promise.all([
    db.learning_records.filter((item) => !item.deleted_at).toArray(),
    db.learning_assessments.filter((item) => !item.deleted_at).toArray(),
  ]);
  const earliest = [
    ...records.map((record) => record.occurred_on),
    ...assessments.map((assessment) => assessment.occurred_on),
  ].sort()[0];
  return earliest ? { start: earliest, end: getTodayDateString() } : null;
}

function getLearningFixedRangeBounds(range: Exclude<LearningRangeKey, "all">): LearningDateBounds {
  const end = new Date();
  const start = new Date();
  if (range === "30d") start.setDate(end.getDate() - 29);
  if (range === "month") start.setDate(1);
  if (range === "year") {
    start.setMonth(0);
    start.setDate(1);
  }
  if (range === "week") {
    const mondayOffset = (end.getDay() + 6) % 7;
    start.setDate(end.getDate() - mondayOffset);
  }
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

function filterLearningRecordsByBounds(
  records: LearningRecordSummary[],
  bounds: LearningDateBounds | null,
): LearningRecordSummary[] {
  if (!bounds) return [];
  return records.filter((record) => record.occurred_on >= bounds.start && record.occurred_on <= bounds.end);
}

function filterLearningAssessmentsByBounds(
  assessments: LearningAssessmentSummary[],
  bounds: LearningDateBounds | null,
): LearningAssessmentSummary[] {
  if (!bounds) return [];
  return assessments.filter(
    (assessment) => assessment.occurred_on >= bounds.start && assessment.occurred_on <= bounds.end,
  );
}

function sumMinutes(records: LearningRecordSummary[]): number {
  return records.reduce((sum, record) => sum + (record.duration_min ?? 0), 0);
}

function createDomainOverview(
  domain: LearningDomainSummary,
  projects: LearningProjectSummary[],
  monthRecords: LearningRecordSummary[],
  allRecords: LearningRecordSummary[],
): LearningDomainOverview {
  const domainProjects = projects.filter((project) => project.domain_id === domain.id);
  const projectIds = new Set(domainProjects.map((project) => project.id));
  const domainMonthRecords = monthRecords.filter((record) => projectIds.has(record.project_id));
  const domainRecords = allRecords.filter((record) => projectIds.has(record.project_id));
  return {
    domain,
    activeProjectCount: domainProjects.filter((project) => project.status === "active").length,
    monthMinutes: sumMinutes(domainMonthRecords),
    recentStudyDate: getLatestDate(domainRecords.map((record) => record.occurred_on)),
  };
}

function createProjectCard(
  project: LearningProjectSummary,
  domain: LearningDomainSummary | null,
  stages: LearningPathStageSummary[],
  monthRecords: LearningRecordSummary[],
  allRecords: LearningRecordSummary[],
  assessments: LearningAssessmentSummary[],
): LearningProjectCard {
  const projectRecords = allRecords.filter((record) => record.project_id === project.id);
  const projectAssessments = assessments.filter((assessment) => assessment.project_id === project.id);
  return {
    project,
    domain,
    activeStage:
      stages.find((stage) => stage.project_id === project.id && stage.status === "active") ??
      stages.find((stage) => stage.project_id === project.id && stage.status === "pending") ??
      null,
    monthMinutes: sumMinutes(monthRecords.filter((record) => record.project_id === project.id)),
    recentStudyDate: getLatestDate(projectRecords.map((record) => record.occurred_on)),
    recentNextStep: projectRecords.find((record) => record.next_step)?.next_step ?? null,
    recentAssessmentDate: getLatestDate(projectAssessments.map((assessment) => assessment.occurred_on)),
  };
}

function sortProjectCards(a: LearningProjectCard, b: LearningProjectCard): number {
  const statusOrder = getProjectStatusOrder(a.project.status) - getProjectStatusOrder(b.project.status);
  return statusOrder || (b.recentStudyDate ?? "").localeCompare(a.recentStudyDate ?? "") || a.project.title.localeCompare(b.project.title);
}

function getLatestDate(values: string[]): string | null {
  return values.sort().reverse()[0] ?? null;
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

function createLearningAiPrompt(detail: LearningProjectDetail): string {
  const recentBounds = getLearningFixedRangeBounds("30d");
  const recentRecords = filterLearningRecordsByBounds(detail.records, recentBounds);
  const recentAssessments = filterLearningAssessmentsByBounds(detail.assessments, recentBounds);
  const activeResources = detail.resources.filter((resource) => resource.status !== "rejected");
  const rejectedResources = detail.resources.filter((resource) => resource.status === "rejected");
  const topTags = countLearningTags(recentRecords)
    .slice(0, 8)
    .map(([tag, count]) => `${tag} ${count}次`);

  return [
    "请基于以下 Loom 学习记录，帮助我分析当前自学路径。",
    "",
    "## 学习领域",
    detail.domain?.name ?? "未设置",
    "",
    "## 项目基本信息",
    `项目名称：${detail.project.title}`,
    `项目状态：${detail.project.status}`,
    `学习目标：${detail.project.goal ?? "未填写"}`,
    `当前水平：${detail.project.current_level ?? "未填写"}`,
    `目标状态：${detail.project.target_state ?? "未填写"}`,
    `学习动机：${detail.project.motivation ?? "未填写"}`,
    `开始日期：${detail.project.start_date}`,
    `目标日期：${detail.project.target_date ?? "未设置"}`,
    `每周可投入时间：${detail.project.weekly_time_budget_min ?? "未设置"} 分钟`,
    `现实限制：${detail.project.constraints ?? "未填写"}`,
    `学习偏好：${detail.project.preferred_methods ?? "未填写"}`,
    "",
    "## 当前学习路径阶段",
    formatPromptList(
      detail.stages.map(
        (stage) =>
          `${stage.sort_order}. ${stage.title}（${stage.status}）｜目标：${stage.stage_goal ?? "未填写"}｜完成标准：${stage.completion_criteria ?? "未填写"}`,
      ),
    ),
    "",
    "## 当前 Daily Routine",
    formatPromptList(
      detail.routines.map(
        (routine) =>
          `${routine.title}（${routine.frequency_type}，${routine.is_active ? "启用" : "停用"}）｜标准：${routine.standard_action ?? "未填写"}｜最低：${routine.minimum_action ?? "未填写"}｜预计 ${routine.estimated_minutes ?? "未设置"} 分钟`,
      ),
    ),
    "",
    "## 正在使用的资源",
    formatPromptList(
      activeResources.map(
        (resource) =>
          `${resource.name}（${resource.resource_type}/${resource.status}）｜用途：${resource.purpose ?? "未填写"}｜评价：${resource.evaluation ?? "未填写"}`,
      ),
    ),
    "",
    "## 已淘汰资源及评价",
    formatPromptList(
      rejectedResources.map(
        (resource) =>
          `${resource.name}｜评价：${resource.evaluation ?? "未填写"}｜备注：${resource.note ?? "未填写"}`,
      ),
    ),
    "",
    "## 最近30天学习记录",
    `总学习时长：${sumMinutes(recentRecords)} 分钟`,
    `学习天数：${new Set(recentRecords.map((record) => record.occurred_on)).size} 天`,
    formatPromptList(
      recentRecords.map(
        (record) =>
          `${record.occurred_on}｜${record.duration_min ?? 0} 分钟｜${record.completion_level}｜内容：${record.content ?? "未填写"}｜产出：${record.output ?? "未填写"}｜下一步：${record.next_step ?? "未填写"}`,
      ),
    ),
    "",
    "## 最近30天产出",
    formatPromptList(recentRecords.map((record) => record.output).filter((value): value is string => Boolean(value))),
    "",
    "## 高频困难标签",
    formatPromptList(topTags),
    "",
    "## 最近检验结果",
    formatPromptList(
      recentAssessments.map(
        (assessment) =>
          `${assessment.occurred_on}｜${assessment.title}（${assessment.assessment_type}）｜结果：${assessment.result ?? "未填写"}｜暴露问题：${assessment.exposed_problems ?? "未填写"}｜建议调整：${assessment.proposed_adjustment ?? "未填写"}`,
      ),
    ),
    "",
    "## 用户记录的下一步",
    formatPromptList(recentRecords.map((record) => record.next_step).filter((value): value is string => Boolean(value))),
    "",
    "## 请回答",
    "1. 当前目标是否清晰且可执行？",
    "2. 当前学习路径是否与目标匹配？",
    "3. 学习资源是否过多、过难或重复？",
    "4. Daily Routine是否符合实际可投入时间？",
    "5. 当前学习是否存在输入过多、输出或检验不足？",
    "6. 根据现有记录，下一阶段应如何调整？",
    "7. 请只基于已有记录提出建议，并明确说明数据不足之处。",
  ].join("\n");
}

function formatPromptList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 暂无记录";
}

function countLearningTags(records: LearningRecordSummary[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const tag of record.difficulty_tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
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
