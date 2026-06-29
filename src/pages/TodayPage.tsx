import { useEffect, useState } from "react";
import { BodyFormKind, BodyRecordForm } from "../components/BodyRecordForms";
import { BodyHistoryItem, DataAccessPort } from "../app/ports";
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
  const [message, setMessage] = useState("身体记录已接入本地保存。");

  useEffect(() => {
    void refreshToday();
  }, []);

  const refreshToday = async () => {
    const today = formatLocalDate(new Date());
    const [history, overview] = await Promise.all([
      dataAccess.listBodyHistoryByDate(today),
      dataAccess.getBodyOverview(today, today),
    ]);
    setRecords(history);
    setExerciseTypes(overview.exerciseTypes);
  };

  const handleSaved = async (nextMessage: string) => {
    await refreshToday();
    setActiveForm(null);
    setShowBodyTypes(false);
    setMessage(nextMessage);
  };

  return (
    <>
      <PageSection title="快捷新增" description="身体记录支持测量、运动、月经和身体状态。">
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
            <button type="button" onClick={() => setActiveForm("status")}>
              身体状态
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
            onSaved={handleSaved}
          />
        </PageSection>
      ) : null}

      <PageSection title="今日已记录内容">
        {records.length > 0 ? (
          <div className="stack">
            {records.map((record) => (
              <article className="placeholder-card" key={`${record.type}-${record.item.id}`}>
                <div>
                  <h3>{getHistoryTitle(record)}</h3>
                  <p>{getHistorySummary(record)}</p>
                  <p>{getHistoryMeta(record)}</p>
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
        <p className="status-text">{message}</p>
      </PageSection>

      <PageSection title="补记与设置">
        <div className="action-row">
          <button
            type="button"
            onClick={() => {
              setShowBodyTypes(true);
              setActiveForm("measurement");
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
  return "身体状态";
}

export function getHistorySummary(record: BodyHistoryItem): string {
  if (record.type === "measurement") {
    const item = record.item;
    return [
      item.weight_kg !== null ? `体重 ${item.weight_kg} kg` : null,
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
  return record.item.status_tags.length > 0 ? record.item.status_tags.join(" · ") : "身体状态备注";
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
      ? record.occurred_on
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
  return "身体状态";
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
