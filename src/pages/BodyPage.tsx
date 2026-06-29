import { useEffect, useMemo, useState } from "react";
import { BodyFormKind, BodyRecordForm } from "../components/BodyRecordForms";
import {
  BodyHistoryItem,
  BodyMeasurementSummary,
  BodyOverview,
  DataAccessPort,
  MenstrualSummary,
} from "../app/ports";
import { PageSection } from "../components/PageSection";
import { getHistoryMeta, getHistorySummary, getHistoryTitle } from "./TodayPage";
import { PageProps } from "./pageTypes";

interface BodyPageProps extends PageProps {
  dataAccess: DataAccessPort;
}

type RangeKey = "7d" | "30d" | "month";
type TrendMetric = "weight_kg" | "body_fat_percent" | "skeletal_muscle_kg";

export function BodyPage({ dataAccess }: BodyPageProps) {
  const [range, setRange] = useState<RangeKey>("7d");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight_kg");
  const [overview, setOverview] = useState<BodyOverview | null>(null);
  const [activeForm, setActiveForm] = useState<BodyFormKind | null>(null);
  const [message, setMessage] = useState("身体页展示真实本地数据。");

  const rangeBounds = useMemo(() => getRangeBounds(range), [range]);

  useEffect(() => {
    void refreshOverview();
  }, [range]);

  const refreshOverview = async () => {
    const nextOverview = await dataAccess.getBodyOverview(rangeBounds.start, rangeBounds.end);
    setOverview(nextOverview);
  };

  const handleSaved = async (nextMessage: string) => {
    await refreshOverview();
    setActiveForm(null);
    setMessage(nextMessage);
  };

  const latestMeasurement =
    overview && overview.measurements.length > 0
      ? overview.measurements[overview.measurements.length - 1]
      : null;
  const representativeTrend = getRepresentativeTrend(overview?.measurements ?? [], trendMetric);
  const exerciseStats = getExerciseStats(overview);
  const menstrualSummary = getMenstrualSummary(overview?.menstrualRecords ?? []);
  const statusFrequency = getStatusFrequency(overview?.statuses ?? []);

  return (
    <>
      <PageSection title="新增身体记录">
        <div className="choice-grid">
          <button type="button" onClick={() => setActiveForm("measurement")}>身体测量</button>
          <button type="button" onClick={() => setActiveForm("exercise")}>运动</button>
          <button type="button" onClick={() => setActiveForm("menstrual")}>月经</button>
          <button type="button" onClick={() => setActiveForm("status")}>身体状态</button>
        </div>
        <p className="status-text">{message}</p>
      </PageSection>

      {activeForm && overview ? (
        <PageSection title={getFormTitle(activeForm)}>
          <BodyRecordForm
            dataAccess={dataAccess}
            exerciseTypes={overview.exerciseTypes}
            formKind={activeForm}
            onCancel={() => setActiveForm(null)}
            onSaved={handleSaved}
          />
        </PageSection>
      ) : null}

      <PageSection title="时间范围">
        <div className="segmented">
          <button type="button" aria-pressed={range === "7d"} onClick={() => setRange("7d")}>近7天</button>
          <button type="button" aria-pressed={range === "30d"} onClick={() => setRange("30d")}>近30天</button>
          <button type="button" aria-pressed={range === "month"} onClick={() => setRange("month")}>月度</button>
        </div>
      </PageSection>

      <PageSection title="最近身体测量">
        {latestMeasurement ? (
          <article className="placeholder-card">
            <div>
              <h3>{latestMeasurement.occurred_on}</h3>
              <p>{formatMeasurementSummary(latestMeasurement)}</p>
              <p>{[latestMeasurement.source, latestMeasurement.condition].filter(Boolean).join(" · ") || "未记录来源和状态"}</p>
            </div>
          </article>
        ) : (
          <p>还没有身体测量记录。</p>
        )}
      </PageSection>

      <PageSection title="身体趋势" description="趋势使用每日代表值：优先晨起空腹，其次当天最早记录。">
        <div className="segmented">
          <button type="button" aria-pressed={trendMetric === "weight_kg"} onClick={() => setTrendMetric("weight_kg")}>体重</button>
          <button type="button" aria-pressed={trendMetric === "body_fat_percent"} onClick={() => setTrendMetric("body_fat_percent")}>体脂率</button>
          <button type="button" aria-pressed={trendMetric === "skeletal_muscle_kg"} onClick={() => setTrendMetric("skeletal_muscle_kg")}>骨骼肌量</button>
        </div>
        {representativeTrend.length >= 2 ? (
          <>
            <MiniTrendChart points={representativeTrend} />
            {overview?.hasMultipleMeasurementSources ? (
              <p className="status-text">测量来源不同，变化仅供参考。</p>
            ) : null}
          </>
        ) : (
          <p>当前数据不足，记录 2 个以上日期后可查看趋势。</p>
        )}
      </PageSection>

      <PageSection title="运动统计">
        <div className="metric-row">
          <div><strong>{exerciseStats.count}</strong><span>运动次数</span></div>
          <div><strong>{exerciseStats.duration}</strong><span>累计分钟</span></div>
          <div><strong>{exerciseStats.distance}</strong><span>累计 km</span></div>
        </div>
        <HistoryList items={overview?.history.filter((item) => item.type === "exercise").slice(0, 3) ?? []} empty="暂无运动记录。" />
      </PageSection>

      <PageSection title="月经回顾">
        <article className="placeholder-card">
          <div>
            <h3>{menstrualSummary.title}</h3>
            <p>{menstrualSummary.body}</p>
          </div>
        </article>
      </PageSection>

      <PageSection title="身体状态">
        {statusFrequency.length > 0 ? (
          <div className="chip-row">
            {statusFrequency.map(([tag, count]) => (
              <button type="button" key={tag}>{tag} {count}</button>
            ))}
          </div>
        ) : (
          <p>暂无身体状态标签。</p>
        )}
        <HistoryList items={overview?.history.filter((item) => item.type === "status").slice(0, 3) ?? []} empty="暂无身体状态记录。" />
      </PageSection>

      <PageSection title="身体历史">
        <HistoryList items={overview?.history ?? []} empty="所选时间范围内暂无身体记录。" />
      </PageSection>
    </>
  );
}

function HistoryList({ items, empty }: { items: BodyHistoryItem[]; empty: string }) {
  if (items.length === 0) return <p>{empty}</p>;
  return (
    <div className="stack">
      {items.map((record) => (
        <article className="placeholder-card" key={`${record.type}-${record.item.id}`}>
          <div>
            <h3>{getHistoryTitle(record)}</h3>
            <p>{getHistorySummary(record)}</p>
            <p>{record.occurred_on} · {getHistoryMeta(record)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function MiniTrendChart({ points }: { points: Array<{ date: string; value: number }> }) {
  const width = 320;
  const height = 132;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / spread) * (height - 24) - 12;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="chart-box">
      <svg role="img" viewBox={`0 0 ${width} ${height}`}>
        <path d={path} fill="none" stroke="#2f5d62" strokeLinecap="round" strokeWidth="3" />
      </svg>
      <p>{points[0]?.date} 至 {points[points.length - 1]?.date}</p>
    </div>
  );
}

function getRepresentativeTrend(measurements: BodyMeasurementSummary[], metric: TrendMetric) {
  const byDate = new Map<string, BodyMeasurementSummary[]>();
  for (const measurement of measurements.filter((item) => item[metric] !== null)) {
    const list = byDate.get(measurement.occurred_on) ?? [];
    list.push(measurement);
    byDate.set(measurement.occurred_on, list);
  }
  return Array.from(byDate.entries())
    .map(([date, items]) => {
      const preferred =
        items.find((item) => item.condition?.includes("晨起空腹")) ??
        [...items].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))[0];
      return { date, value: preferred[metric] as number };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getExerciseStats(overview: BodyOverview | null) {
  const exercises = overview?.exercises ?? [];
  return {
    count: exercises.length,
    duration: exercises.reduce((sum, item) => sum + (item.duration_min ?? 0), 0),
    distance: Number(exercises.reduce((sum, item) => sum + (item.distance_km ?? 0), 0).toFixed(1)),
  };
}

function getMenstrualSummary(records: MenstrualSummary[]) {
  if (records.length === 0) return { title: "暂无月经记录", body: "第一版只展示事实记录和周期信息。" };
  const sorted = [...records].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const latest = sorted[sorted.length - 1]!;
  const latestLabel = `${latest.occurred_on} ${latest.event_type === "start" ? "开始" : "结束"}`;
  const openStart = getOpenStart(sorted);
  const lastPair = getLastCompletedPair(sorted);
  if (openStart) {
    return { title: `当前未结束：${openStart.occurred_on} 开始`, body: `最近事件：${latestLabel}` };
  }
  if (lastPair) {
    return { title: `最近事件：${latestLabel}`, body: `最近一次持续 ${daysBetween(lastPair.start.occurred_on, lastPair.end.occurred_on) + 1} 天。` };
  }
  return { title: `最近事件：${latestLabel}`, body: "存在无法配对的事实记录，暂不计算持续天数。" };
}

function getOpenStart(records: MenstrualSummary[]) {
  let open: MenstrualSummary | null = null;
  for (const record of records) {
    if (record.event_type === "start") open = record;
    if (record.event_type === "end" && open) open = null;
  }
  return open;
}

function getLastCompletedPair(records: MenstrualSummary[]) {
  let open: MenstrualSummary | null = null;
  let pair: { start: MenstrualSummary; end: MenstrualSummary } | null = null;
  for (const record of records) {
    if (record.event_type === "start") open = record;
    if (record.event_type === "end" && open) {
      pair = { start: open, end: record };
      open = null;
    }
  }
  return pair;
}

function getStatusFrequency(statuses: BodyOverview["statuses"]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const status of statuses) {
    for (const tag of status.status_tags) map.set(tag, (map.get(tag) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function getRangeBounds(range: RangeKey) {
  const end = new Date();
  const start = new Date();
  if (range === "7d") start.setDate(end.getDate() - 6);
  if (range === "30d") start.setDate(end.getDate() - 29);
  if (range === "month") start.setDate(1);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
}

function formatMeasurementSummary(item: BodyMeasurementSummary): string {
  return [
    item.weight_kg !== null ? `体重 ${item.weight_kg} kg` : null,
    item.body_fat_percent !== null ? `体脂率 ${item.body_fat_percent}%` : null,
    item.skeletal_muscle_kg !== null ? `骨骼肌量 ${item.skeletal_muscle_kg} kg` : null,
  ]
    .filter(Boolean)
    .join(" · ");
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
