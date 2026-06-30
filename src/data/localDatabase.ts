import Dexie, { Table } from "dexie";
import {
  AppMetaEntry,
  BodyMeasurementRecord,
  BodyStatusRecord,
  ExerciseRecord,
  GenericRecord,
  InterestCategoryRecord,
  MenstrualRecord,
  ProfileRecord,
} from "./models";

export const DATABASE_NAME = "personal-manager-local";

export class PersonalManagerDatabase extends Dexie {
  app_meta!: Table<AppMetaEntry, string>;
  profile!: Table<ProfileRecord, string>;
  body_measurements!: Table<BodyMeasurementRecord, string>;
  exercise_records!: Table<ExerciseRecord, string>;
  menstrual_records!: Table<MenstrualRecord, string>;
  body_status_records!: Table<BodyStatusRecord, string>;
  learning_projects!: Table<GenericRecord, string>;
  learning_records!: Table<GenericRecord, string>;
  interest_categories!: Table<InterestCategoryRecord, string>;
  interest_projects!: Table<GenericRecord, string>;
  interest_progress_records!: Table<GenericRecord, string>;
  photos!: Table<GenericRecord, string>;
  photo_blobs!: Table<GenericRecord, string>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      app_meta: "key",
      profile: "id",
      body_measurements: "id, occurred_on, deleted_at",
      exercise_records: "id, occurred_on, exercise_type, deleted_at",
      menstrual_records: "id, occurred_on, event_type, deleted_at",
      body_status_records: "id, occurred_on, deleted_at",
      learning_projects: "id, status, archived_at, deleted_at",
      learning_records: "id, project_id, occurred_on, deleted_at",
      interest_categories: "id, sort_order, is_preset, deleted_at",
      interest_projects: "id, category_id, status, archived_at, deleted_at",
      interest_progress_records: "id, project_id, occurred_on, deleted_at",
      photos: "id, progress_id, is_to_print, deleted_at",
      photo_blobs: "id, photo_id, variant",
    });
    this.version(2)
      .stores({
        app_meta: "key",
        profile: "id",
        body_measurements: "id, occurred_on, deleted_at",
        exercise_records: "id, occurred_on, exercise_type, deleted_at",
        menstrual_records: "id, occurred_on, event_type, deleted_at",
        body_status_records: "id, occurred_on, weather_level, deleted_at",
        learning_projects: "id, status, archived_at, deleted_at",
        learning_records: "id, project_id, occurred_on, deleted_at",
        interest_categories: "id, sort_order, is_preset, deleted_at",
        interest_projects: "id, category_id, status, archived_at, deleted_at",
        interest_progress_records: "id, project_id, occurred_on, deleted_at",
        photos: "id, progress_id, is_to_print, deleted_at",
        photo_blobs: "id, photo_id, variant",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("body_status_records")
          .toCollection()
          .modify((record) => {
            if (!("weather_level" in record)) {
              record.weather_level = null;
            }
          });
      });
  }
}

export const db = new PersonalManagerDatabase();
