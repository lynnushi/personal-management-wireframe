import { FormEvent, useState } from "react";
import {
  BodyMeasurementInput,
  BodyStatusInput,
  DataAccessPort,
  ExerciseInput,
  MenstrualInput,
} from "../app/ports";

export type BodyFormKind = "measurement" | "exercise" | "menstrual" | "status";

interface BodyRecordFormsProps {
  dataAccess: DataAccessPort;
  formKind: BodyFormKind;
  exerciseTypes: string[];
  onSaved: (message: string) => Promise<void> | void;
  onCancel: () => void;
}

export function BodyRecordForm({
  dataAccess,
  formKind,
  exerciseTypes,
  onSaved,
  onCancel,
}: BodyRecordFormsProps) {
  if (formKind === "measurement") {
    return <MeasurementForm dataAccess={dataAccess} onCancel={onCancel} onSaved={onSaved} />;
  }
  if (formKind === "exercise") {
    return (
      <ExerciseForm
        dataAccess={dataAccess}
        exerciseTypes={exerciseTypes}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    );
  }
  if (formKind === "menstrual") {
    return <MenstrualForm dataAccess={dataAccess} onCancel={onCancel} onSaved={onSaved} />;
  }
  return <StatusForm dataAccess={dataAccess} onCancel={onCancel} onSaved={onSaved} />;
}

function MeasurementForm({ dataAccess, onSaved, onCancel }: FormProps) {
  const [form, setForm] = useState(() => ({
    occurred_on: formatLocalDate(new Date()),
    occurred_time: formatLocalTime(new Date()),
    weight_kg: "",
    body_fat_percent: "",
    skeletal_muscle_kg: "",
    source: "",
    condition: "",
    note: "",
  }));
  const [message, setMessage] = useState("体重、体脂率、骨骼肌量至少填写一项。");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: BodyMeasurementInput = {
      occurred_on: getFormString(formData, "occurred_on"),
      occurred_time: getFormString(formData, "occurred_time"),
      weight_kg: parseOptionalNumber(getFormString(formData, "weight_kg")),
      body_fat_percent: parseOptionalNumber(getFormString(formData, "body_fat_percent")),
      skeletal_muscle_kg: parseOptionalNumber(getFormString(formData, "skeletal_muscle_kg")),
      source: getFormString(formData, "source"),
      condition: getFormString(formData, "condition"),
      note: getFormString(formData, "note"),
    };
    try {
      await dataAccess.createBodyMeasurement(input);
      await onSaved("身体测量已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  };

  return (
    <form className="form-stack" onSubmit={submit}>
      <DateTimeFields
        date={form.occurred_on}
        time={form.occurred_time}
        onDate={(value) => setForm((current) => ({ ...current, occurred_on: value }))}
        onTime={(value) => setForm((current) => ({ ...current, occurred_time: value }))}
      />
      <div className="field-grid">
        <NumberField label="体重 kg" name="weight_kg" value={form.weight_kg} onChange={(value) => setForm((current) => ({ ...current, weight_kg: value }))} />
        <NumberField label="体脂率 %" name="body_fat_percent" value={form.body_fat_percent} onChange={(value) => setForm((current) => ({ ...current, body_fat_percent: value }))} />
        <NumberField label="骨骼肌量 kg" name="skeletal_muscle_kg" value={form.skeletal_muscle_kg} onChange={(value) => setForm((current) => ({ ...current, skeletal_muscle_kg: value }))} />
      </div>
      <TextField label="测量来源" name="source" placeholder="家用体脂秤、InBody、医院等" value={form.source} onChange={(value) => setForm((current) => ({ ...current, source: value }))} />
      <TextField label="测量状态" name="condition" placeholder="晨起空腹、饭后、运动后等" value={form.condition} onChange={(value) => setForm((current) => ({ ...current, condition: value }))} />
      <TextareaField label="备注" name="note" value={form.note} onChange={(value) => setForm((current) => ({ ...current, note: value }))} />
      <FormActions message={message} onCancel={onCancel} />
    </form>
  );
}

function ExerciseForm({ dataAccess, onSaved, onCancel, exerciseTypes }: FormProps & { exerciseTypes: string[] }) {
  const [form, setForm] = useState(() => ({
    occurred_on: formatLocalDate(new Date()),
    occurred_time: formatLocalTime(new Date()),
    exercise_type: "",
    duration_min: "",
    distance_km: "",
    intensity: "",
    content: "",
    body_feeling: "",
    note: "",
  }));
  const [message, setMessage] = useState("日期和运动类型必填；其他字段可选。");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: ExerciseInput = {
      occurred_on: getFormString(formData, "occurred_on"),
      occurred_time: getFormString(formData, "occurred_time"),
      exercise_type: getFormString(formData, "exercise_type"),
      duration_min: parseOptionalNumber(getFormString(formData, "duration_min")),
      distance_km: parseOptionalNumber(getFormString(formData, "distance_km")),
      intensity: getFormString(formData, "intensity"),
      content: getFormString(formData, "content"),
      body_feeling: getFormString(formData, "body_feeling"),
      note: getFormString(formData, "note"),
    };
    try {
      await dataAccess.createExerciseRecord(input);
      await onSaved("运动记录已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  };

  return (
    <form className="form-stack" onSubmit={submit}>
      <DateTimeFields
        date={form.occurred_on}
        time={form.occurred_time}
        onDate={(value) => setForm((current) => ({ ...current, occurred_on: value }))}
        onTime={(value) => setForm((current) => ({ ...current, occurred_time: value }))}
      />
      <label>
        运动类型
        <input
          list="exercise-types"
          name="exercise_type"
          placeholder="跑步、力量训练、健身环等"
          defaultValue={form.exercise_type}
          onChange={(event) => setForm((current) => ({ ...current, exercise_type: event.target.value }))}
        />
      </label>
      <datalist id="exercise-types">
        {exerciseTypes.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <div className="field-grid">
        <NumberField label="时长 分钟" name="duration_min" value={form.duration_min} onChange={(value) => setForm((current) => ({ ...current, duration_min: value }))} />
        <NumberField label="距离 km" name="distance_km" value={form.distance_km} onChange={(value) => setForm((current) => ({ ...current, distance_km: value }))} />
        <TextField label="强度" name="intensity" placeholder="低、中、高" value={form.intensity} onChange={(value) => setForm((current) => ({ ...current, intensity: value }))} />
      </div>
      <TextareaField label="训练内容" name="content" value={form.content} onChange={(value) => setForm((current) => ({ ...current, content: value }))} />
      <TextField label="运动后身体感受" name="body_feeling" placeholder="轻松、疲劳、疼痛等" value={form.body_feeling} onChange={(value) => setForm((current) => ({ ...current, body_feeling: value }))} />
      <TextareaField label="备注" name="note" value={form.note} onChange={(value) => setForm((current) => ({ ...current, note: value }))} />
      <FormActions message={message} onCancel={onCancel} />
    </form>
  );
}

function MenstrualForm({ dataAccess, onSaved, onCancel }: FormProps) {
  const [form, setForm] = useState(() => ({
    occurred_on: formatLocalDate(new Date()),
    event_type: "start" as "start" | "end",
    flow: "",
    symptoms: "",
    note: "",
  }));
  const [message, setMessage] = useState("日期和事件类型必填。");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: MenstrualInput = {
      occurred_on: getFormString(formData, "occurred_on"),
      event_type: form.event_type,
      flow: getFormString(formData, "flow"),
      symptoms: splitTags(getFormString(formData, "symptoms")),
      note: getFormString(formData, "note"),
    };
    try {
      await dataAccess.createMenstrualRecord(input);
      await onSaved("月经记录已保存。");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "保存失败。";
      if (messageText.includes("未结束的开始记录")) {
        const confirmed = window.confirm(`${messageText}\n\n确认开启新周期吗？`);
        if (confirmed) {
          await dataAccess.createMenstrualRecord({ ...input, confirm_duplicate_start: true });
          await onSaved("月经开始记录已保存。");
          return;
        }
      }
      setMessage(messageText);
    }
  };

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        记录日期
        <input
          max={formatLocalDate(new Date())}
          name="occurred_on"
          type="date"
          defaultValue={form.occurred_on}
          onChange={(event) => setForm((current) => ({ ...current, occurred_on: event.target.value }))}
        />
      </label>
      <div className="segmented">
        <button type="button" aria-pressed={form.event_type === "start"} onClick={() => setForm((current) => ({ ...current, event_type: "start" }))}>
          开始
        </button>
        <button type="button" aria-pressed={form.event_type === "end"} onClick={() => setForm((current) => ({ ...current, event_type: "end" }))}>
          结束
        </button>
      </div>
      <TextField label="流量" name="flow" placeholder="少、中、多" value={form.flow} onChange={(value) => setForm((current) => ({ ...current, flow: value }))} />
      <TextField label="症状" name="symptoms" placeholder="腹痛、腰酸、疲劳，用顿号或逗号分隔" value={form.symptoms} onChange={(value) => setForm((current) => ({ ...current, symptoms: value }))} />
      <TextareaField label="备注" name="note" value={form.note} onChange={(value) => setForm((current) => ({ ...current, note: value }))} />
      <FormActions message={message} onCancel={onCancel} />
    </form>
  );
}

function StatusForm({ dataAccess, onSaved, onCancel }: FormProps) {
  const [form, setForm] = useState(() => ({
    occurred_on: formatLocalDate(new Date()),
    occurred_time: formatLocalTime(new Date()),
    status_tags: "",
    note: "",
  }));
  const [message, setMessage] = useState("状态标签或备注至少填写一项。");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input: BodyStatusInput = {
      occurred_on: getFormString(formData, "occurred_on"),
      occurred_time: getFormString(formData, "occurred_time"),
      status_tags: splitTags(getFormString(formData, "status_tags")),
      note: getFormString(formData, "note"),
    };
    try {
      await dataAccess.createBodyStatusRecord(input);
      await onSaved("身体状态已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  };

  return (
    <form className="form-stack" onSubmit={submit}>
      <DateTimeFields
        date={form.occurred_on}
        time={form.occurred_time}
        onDate={(value) => setForm((current) => ({ ...current, occurred_on: value }))}
        onTime={(value) => setForm((current) => ({ ...current, occurred_time: value }))}
      />
      <TextField label="状态标签" name="status_tags" placeholder="疲劳、浮肿、睡眠不足，用顿号或逗号分隔" value={form.status_tags} onChange={(value) => setForm((current) => ({ ...current, status_tags: value }))} />
      <TextareaField label="备注" name="note" value={form.note} onChange={(value) => setForm((current) => ({ ...current, note: value }))} />
      <FormActions message={message} onCancel={onCancel} />
    </form>
  );
}

interface FormProps {
  dataAccess: DataAccessPort;
  onSaved: (message: string) => Promise<void> | void;
  onCancel: () => void;
}

function DateTimeFields({ date, time, onDate, onTime }: { date: string; time: string; onDate: (value: string) => void; onTime: (value: string) => void }) {
  return (
    <div className="field-grid">
      <label>
        记录日期
        <input max={formatLocalDate(new Date())} name="occurred_on" type="date" defaultValue={date} onChange={(event) => onDate(event.target.value)} />
      </label>
      <label>
        记录时间
        <input name="occurred_time" type="time" defaultValue={time} onChange={(event) => onTime(event.target.value)} />
      </label>
    </div>
  );
}

function NumberField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input inputMode="decimal" min="0" name={name} step="0.1" type="number" defaultValue={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextField({ label, name, value, onChange, placeholder }: { label: string; name: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      {label}
      <input name={name} placeholder={placeholder} type="text" defaultValue={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextareaField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <textarea name={name} rows={3} defaultValue={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FormActions({ message, onCancel }: { message: string; onCancel: () => void }) {
  return (
    <>
      <div className="action-row">
        <button type="submit">保存</button>
        <button className="ghost-button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
      <p className="status-text">{message}</p>
    </>
  );
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function splitTags(value: string): string[] {
  return value
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
