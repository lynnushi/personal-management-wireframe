import { useEffect, useState } from "react";
import { BodyFormKind, BodyRecordForm } from "../components/BodyRecordForms";
import { BodyHistoryItem, BodyRecordType, DataAccessPort, ProfileSummary } from "../app/ports";
import { getBodyWeatherOption } from "../app/bodyWeather";
import { calculateBmi, formatBmi } from "../app/bmi";
import { PageSection } from "../components/PageSection";
import { PlaceholderCard } from "../components/PlaceholderCard";
import { PageProps } from "./pageTypes";

interface TodayPageProps extends PageProps {
  dataAccess: DataAccessPort;
}

export function TodayPage({ dataAccess, navigate }: TodayPageProps) {
  const [activeForm, setActiveForm] = useState<BodyFormKind | null>(null);
  const [showBodyTypes, setShowBodyTypes] = useState(false);
  const [records, setRecords] = useState<BodyHistoryItem[]>([]);
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ type: BodyRecordType; id: string } | null>(null);
  const [message, setMessage] = useState("身体记录已接入本地保存。");

  useEffect(() => {
    void refreshToday();
  }, []);

  const refreshToday = async () => {
    const today = formatLocalDate(new Date());
    const [history, overview, nextProfile] = await Promise.all([
      dataAccess.listBodyHistoryByDate(today),
      dataAccess.getBodyOverview(today, today),
      dataAccess.getProfile(),
    ]);
    setRecords(history);
    setExerciseTypes(overview.exerciseTypes);
    setProfile(nextProfile);
  };

  const handleSaved = async (nextMessage: string) => {
    await refreshToday();
    setActiveForm(null);
    setShowBodyTypes(false);
    setLastDeleted(null);
    setMessage(nextMessage);
  };

  const handleDelete = async (record: BodyHistoryItem) => {
    const confirmed = window.confirm(getDeleteConfirmMessage(record));
    if (!confirmed) return;
    const type = getBodyRecordType(record);
    try {
      await dataAccess.softDeleteBodyRecord(type, record.item.id);
      setLastDeleted({ type, id: record.item.id });
      await refreshToday();
      setMessage("记录已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    }
  };

  const handleRestore = async () => {
    if (!lastDeleted) return;
    try {
      await dataAccess.restoreBodyRecord(lastDeleted.type, lastDeleted.id);
      setLastDeleted(null);
      await refreshToday();
      setMessage("记录已恢复。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "恢复失败。");
    }
  };

  return (
    <>
      <PageSection title="快捷新增" description="身体记录支持身体天气、运动、月经和身体测量。">
        <div className="quick-grid">
          <button type="button" onClick={() => setShowBodyTypes((value) => !value)}>
            身体
          </button>
          <button disabled type="button">
            学习
          </button>
          <button disabled type="button">
            兴趣
          </button>
        </div>
        {showBodyTypes ? (
          <div className="choice-grid">
            <button type="button" onClick={() => setActiveForm("measurement")}>
              身体测量
            </button>
            <button type="button" onClick={() => setActiveForm("exercise")}>
              运动
            </button>
            <button type="button" onClick={() => setActiveForm("menstrual")}>
              月经
            </button>
            <button type="button" onClick={() => setActiveForm("weather")}>
              身体天气
            </button>
          </div>
        ) : null}
      </PageSection>

      {activeForm ? (
        <PageSection title={getFormTitle(activeForm)}>
          <BodyRecordForm
            dataAccess={dataAccess}
            exerciseTypes={exerciseTypes}
            formKind={activeForm}
            onCancel={() => setActiveForm(null)}
            onOpenSettings={() => navigate("/settings")}
            onSaved={handleSaved}
          />
        </PageSection>
      ) : null}

      <PageSection title="今日学习">
        <article className="placeholder-card">
          <div>
            <h3>学习记录请先到学习项目详情页添加</h3>
            <p>V1-A 先在学习项目里维护目标、路径、Routine、记录和反馈，今日页快捷记录会在后续版本接入。</p>
          </div>
          <div className="button-stack compact-actions">
            <button type="button" onClick={() => navigate("/learning")}>
              前往学习页
            </button>
          </div>
        </article>
      </PageSection>

      <PageSection title="今日已记录内容">
        {records.length > 0 ? (
          <div className="stack">
            {records.map((record) => (
              <article className="placeholder-card" key={`${record.type}-${record.item.id}`}>
                <div>
                  <h3>{getHistoryTitle(record)}</h3>
                  <p>{getHistorySummary(record, profile?.height_cm ?? null)}</p>
                  <p>{getHistoryMeta(record)}</p>
                </div>
                <div className="button-stack compact-actions">
                  <button className="text-button danger-button" type="button" onClick={() => handleDelete(record)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <PlaceholderCard
            title="今天还没有记录"
            body="保存当天身体记录后，会在这里显示摘要。补记过去日期会保存到历史数据中，不会显示在今日列表。"
            actionLabel="查看记录详情占位"
            to="/record"
            navigate={navigate}
          />
        )}
        <div className="status-action-row">
          <p className="status-text">{message}</p>
          {lastDeleted ? (
            <button className="text-button" type="button" onClick={handleRestore}>
              撤销
            </button>
          ) : null}
        </div>
      </PageSection>

      <PageSection title="补记与设置">
        <div className="action-row">
          <button
            type="button"
            onClick={() => {
              setShowBodyTypes(true);
              setActiveForm("weather");
            }}
          >
            补记过去日期
          </button>
          <button type="button" onClick={() => navigate("/settings")}>
            设置与数据管理
          </button>
        </div>
      </PageSection>
    </>
  );
}

export function getHistoryTitle(record: BodyHistoryItem): string {
  if (record.type === "measurement") return "身体测量";
  if (record.type === "exercise") return "运动";
  if (record.type === "menstrual") return "月经";
  const weather = getBodyWeatherOption(record.item.weather_level);
  return weather ? `${weather.icon} ${weather.name}` : "身体状态（旧记录）";
}

export function getBodyRecordType(record: BodyHistoryItem): BodyRecordType {
  if (record.type === "measurement") return "measurement";
  if (record.type === "exercise") return "exercise";
  if (record.type === "menstrual") return "menstrual";
  return "weather";
}

export function getDeleteConfirmMessage(record: BodyHistoryItem): string {
  const label = getDeleteRecordLabel(record);
  const effect =
    record.type === "menstrual"
      ? "删除后，该记录将从当前周期和统计中移除。"
      : "删除后，该记录将从趋势和统计中移除。";
  return `确认删除 ${record.occurred_on} 的${label}吗？\n${effect}`;
}

function getDeleteRecordLabel(record: BodyHistoryItem): string {
  if (record.type === "measurement") return "身体测量记录";
  if (record.type === "exercise") return "运动记录";
  if (record.type === "menstrual") {
    return record.item.event_type === "start" ? "月经开始记录" : "月经结束记录";
  }
  return record.item.weather_level === null ? "身体状态旧记录" : "身体天气记录";
}

export function getHistorySummary(record: BodyHistoryItem, heightCm: number | null = null): string {
  if (record.type === "measurement") {
    const item = record.item;
    const bmi = formatBmi(calculateBmi(item.weight_kg, heightCm));
    return [
      item.weight_kg !== null ? `体重 ${item.weight_kg} kg` : null,
      bmi ? `BMI ${bmi}` : null,
      item.body_fat_percent !== null ? `体脂率 ${item.body_fat_percent}%` : null,
      item.skeletal_muscle_kg !== null ? `骨骼肌量 ${item.skeletal_muscle_kg} kg` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (record.type === "exercise") {
    const item = record.item;
    return [
      item.exercise_type,
      item.duration_min !== null ? `${item.duration_min} 分钟` : null,
      item.distance_km !== null ? `${item.distance_km} km` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (record.type === "menstrual") {
    return record.item.event_type === "start" ? "开始" : "结束";
  }
  if (record.item.weather_level === null) {
    return record.item.status_tags.length > 0 ? record.item.status_tags.join(" · ") : "身体状态备注";
  }
  return record.item.status_tags.length > 0 ? record.item.status_tags.join(" · ") : "未记录影响因素";
}

export function getHistoryMeta(record: BodyHistoryItem): string {
  const context =
    record.type === "measurement"
      ? [record.item.source, record.item.condition, record.item.note]
      : record.type === "exercise"
        ? [record.item.intensity, record.item.body_feeling, record.item.note]
        : record.type === "menstrual"
          ? [record.item.flow, ...record.item.symptoms, record.item.note]
          : [record.item.note];

  const time =
    record.type === "menstrual"
      ? "全天"
      : new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(
          new Date(record.occurred_at),
        );
  const details = context.filter(Boolean).join(" · ");
  return details ? `${time} · ${details}` : time;
}

function getFormTitle(kind: BodyFormKind): string {
  if (kind === "measurement") return "身体测量";
  if (kind === "exercise") return "运动记录";
  if (kind === "menstrual") return "月经记录";
  return "身体天气";
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
