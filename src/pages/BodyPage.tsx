import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BODY_WEATHER_LEVELS,
  BodyWeatherLevel,
  getBodyWeatherOption,
} from "../app/bodyWeather";
import { calculateBmi, formatBmi } from "../app/bmi";
import {
  BodyDataBounds,
  BodyHistoryItem,
  BodyMeasurementSummary,
  BodyOverview,
  BodyRecordType,
  BodyStatusSummary,
  DataAccessPort,
  ExerciseSummary,
  MenstrualSummary,
  ProfileSummary,
} from "../app/ports";
import { CollapsibleSection } from "../components/CollapsibleSection";
import {
  getBodyRecordType,
  getDeleteConfirmMessage,
  getHistoryMeta,
  getHistorySummary,
  getHistoryTitle,
} from "./TodayPage";
import { PageProps } from "./pageTypes";

interface BodyPageProps extends PageProps {
  dataAccess: DataAccessPort;
}

type RangeKey = "all" | "year" | "month" | "week" | "30d";
type LayerKey = "weather" | "exercise" | "menstrual" | "measurement";
type LayerState = Record<LayerKey, boolean>;
type TrendMetric = "weight_kg" | "bmi" | "body_fat_percent" | "skeletal_muscle_kg";

interface DailyBodyData {
  date: string;
  weather: BodyStatusSummary | null;
  exercise: ExerciseDaySummary | null;
  menstrual: MenstrualDay | null;
  measurement: BodyMeasurementSummary | null;
}

interface ExerciseDaySummary {
  count: number;
  duration: number;
  distance: number;
  primaryType: string;
}

interface MenstrualDay {
  inPeriod: boolean;
  reliable: boolean;
  dayNumber: number | null;
}

interface DateBounds {
  start: string;
  end: string;
}

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "all", label: "全部数据" },
  { key: "year", label: "本年" },
  { key: "month", label: "本月" },
  { key: "week", label: "本周" },
  { key: "30d", label: "近30天" },
];

const LAYER_LABELS: Record<LayerKey, string> = {
  weather: "身体天气",
  exercise: "运动",
  menstrual: "经期",
  measurement: "身体测量",
};

const TREND_LABELS: Record<TrendMetric, string> = {
  weight_kg: "体重",
  bmi: "BMI",
  body_fat_percent: "体脂率",
  skeletal_muscle_kg: "骨骼肌量",
};

export function BodyPage({ dataAccess }: BodyPageProps) {
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const [trendRange, setTrendRange] = useState<RangeKey>("month");
  const [comparisonRange, setComparisonRange] = useState<RangeKey>("month");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("weight_kg");
  const [layers, setLayers] = useState<LayerState>({
    weather: true,
    exercise: false,
    menstrual: false,
    measurement: false,
  });
  const [bounds, setBounds] = useState<BodyDataBounds>({
    earliestMeasurementDate: null,
    earliestBodyRecordDate: null,
  });
  const [trendOverview, setTrendOverview] = useState<BodyOverview>(() => createEmptyOverview());
  const [comparisonOverview, setComparisonOverview] = useState<BodyOverview>(() => createEmptyOverview());
  const [historyOverview, setHistoryOverview] = useState<BodyOverview>(() => createEmptyOverview());
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ type: BodyRecordType; id: string } | null>(null);
  const [message, setMessage] = useState("身体天气用于个人趋势统计，不代表医学评分。");

  const comparisonBounds = useMemo(
    () => getRangeBounds(comparisonRange, bounds.earliestBodyRecordDate, today),
    [bounds.earliestBodyRecordDate, comparisonRange, today],
  );
  const comparisonDates = useMemo(
    () => (comparisonBounds ? createDateRange(comparisonBounds.start, comparisonBounds.end) : []),
    [comparisonBounds],
  );
  const comparisonDailyData = useMemo(
    () => createDailyData(comparisonDates, comparisonOverview),
    [comparisonDates, comparisonOverview],
  );
  const trendPoints = useMemo(
    () =>
      getRepresentativeTrend(
        trendOverview.measurements,
        trendMetric,
        profile?.height_cm ?? null,
      ),
    [profile?.height_cm, trendMetric, trendOverview.measurements],
  );
  const visibleLayerCount = Object.values(layers).filter(Boolean).length;
  const latestMeasurement = getLatestMeasurement(historyOverview.measurements);

  useEffect(() => {
    void refreshBaseData();
  }, [dataAccess]);

  useEffect(() => {
    void refreshTrend();
  }, [dataAccess, trendRange, bounds.earliestMeasurementDate]);

  useEffect(() => {
    void refreshComparison();
  }, [dataAccess, comparisonRange, bounds.earliestBodyRecordDate]);

  useEffect(() => {
    void refreshHistory();
  }, [dataAccess, bounds.earliestBodyRecordDate]);

  const refreshBaseData = async () => {
    const [nextBounds, nextProfile] = await Promise.all([
      dataAccess.getBodyDataBounds(),
      dataAccess.getProfile(),
    ]);
    setBounds(nextBounds);
    setProfile(nextProfile);
  };

  const refreshTrend = async () => {
    const nextBounds = getRangeBounds(trendRange, bounds.earliestMeasurementDate, today);
    if (!nextBounds) {
      setTrendOverview(createEmptyOverview());
      return;
    }
    setTrendOverview(await dataAccess.getBodyOverview(nextBounds.start, nextBounds.end));
  };

  const refreshComparison = async () => {
    const nextBounds = getRangeBounds(comparisonRange, bounds.earliestBodyRecordDate, today);
    if (!nextBounds) {
      setComparisonOverview(createEmptyOverview());
      return;
    }
    setComparisonOverview(await dataAccess.getBodyOverview(nextBounds.start, nextBounds.end));
  };

  const refreshHistory = async () => {
    if (!bounds.earliestBodyRecordDate) {
      setHistoryOverview(createEmptyOverview());
      return;
    }
    setHistoryOverview(await dataAccess.getBodyOverview(bounds.earliestBodyRecordDate, today));
  };

  const refreshAll = async () => {
    const [nextBounds, nextProfile] = await Promise.all([
      dataAccess.getBodyDataBounds(),
      dataAccess.getProfile(),
    ]);
    const nextTrendBounds = getRangeBounds(
      trendRange,
      nextBounds.earliestMeasurementDate,
      today,
    );
    const nextComparisonBounds = getRangeBounds(
      comparisonRange,
      nextBounds.earliestBodyRecordDate,
      today,
    );
    const nextHistoryBounds = nextBounds.earliestBodyRecordDate
      ? { start: nextBounds.earliestBodyRecordDate, end: today }
      : null;
    const [nextTrend, nextComparison, nextHistory] = await Promise.all([
      nextTrendBounds
        ? dataAccess.getBodyOverview(nextTrendBounds.start, nextTrendBounds.end)
        : Promise.resolve(createEmptyOverview()),
      nextComparisonBounds
        ? dataAccess.getBodyOverview(nextComparisonBounds.start, nextComparisonBounds.end)
        : Promise.resolve(createEmptyOverview()),
      nextHistoryBounds
        ? dataAccess.getBodyOverview(nextHistoryBounds.start, nextHistoryBounds.end)
        : Promise.resolve(createEmptyOverview()),
    ]);
    setBounds(nextBounds);
    setProfile(nextProfile);
    setTrendOverview(nextTrend);
    setComparisonOverview(nextComparison);
    setHistoryOverview(nextHistory);
  };

  const handleDelete = async (record: BodyHistoryItem) => {
    const confirmed = window.confirm(getDeleteConfirmMessage(record));
    if (!confirmed) return;
    const type = getBodyRecordType(record);
    try {
      await dataAccess.softDeleteBodyRecord(type, record.item.id);
      setLastDeleted({ type, id: record.item.id });
      await refreshAll();
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
      await refreshAll();
      setMessage("记录已恢复。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "恢复失败。");
    }
  };

  const toggleLayer = (key: LayerKey) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <>
      <CollapsibleSection
        defaultExpanded
        description="趋势使用每日代表测量值：优先晨起空腹，其次当天最早记录。"
        summary={formatTrendSummary(trendMetric, trendRange, trendPoints)}
        title="身体趋势"
      >
        <div className="module-stack">
          <RangeControls value={trendRange} onChange={setTrendRange} />
          <div className="segmented">
            {(Object.keys(TREND_LABELS) as TrendMetric[]).map((metric) => (
              <button
                aria-pressed={trendMetric === metric}
                key={metric}
                type="button"
                onClick={() => setTrendMetric(metric)}
              >
                {TREND_LABELS[metric]}
              </button>
            ))}
          </div>
          {trendMetric === "bmi" ? (
            <p className="status-text">BMI根据当前身高和体重自动计算，仅供个人趋势参考。</p>
          ) : null}
          {trendPoints.length >= 2 ? (
            <MiniTrendChart points={trendPoints} />
          ) : (
            <p>当前数据不足，记录2个以上有效日期后可查看趋势。</p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        defaultExpanded
        summary={formatComparisonSummary(comparisonRange, layers)}
        title="身体数据对照"
      >
        <div className="module-stack">
          <RangeControls value={comparisonRange} onChange={setComparisonRange} />
          <div className="layer-toggle-grid">
            {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => (
              <button
                aria-pressed={layers[key]}
                className="layer-toggle"
                key={key}
                type="button"
                onClick={() => toggleLayer(key)}
              >
                {LAYER_LABELS[key]}
              </button>
            ))}
          </div>
          {visibleLayerCount === 0 ? (
            <p className="status-text">请至少选择一项要显示的数据。</p>
          ) : (
            <>
              <MultiTrackView
                dailyData={comparisonDailyData}
                heightCm={profile?.height_cm ?? null}
                layers={layers}
                range={comparisonRange}
              />
              <StatsPanel dailyData={comparisonDailyData} layers={layers} />
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        defaultExpanded={false}
        summary={formatHistorySummary(historyOverview.history, latestMeasurement)}
        title="身体历史"
      >
        <div className="module-stack">
          <div className="status-action-row">
            <p className="status-text">{message}</p>
            {lastDeleted ? (
              <button className="text-button" type="button" onClick={handleRestore}>
                撤销
              </button>
            ) : null}
          </div>
          <LatestMeasurementCard
            heightCm={profile?.height_cm ?? null}
            measurement={latestMeasurement}
          />
          <HistoryList
            empty="暂无身体历史记录。"
            heightCm={profile?.height_cm ?? null}
            items={historyOverview.history}
            onDelete={handleDelete}
          />
        </div>
      </CollapsibleSection>
    </>
  );
}

function RangeControls({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (range: RangeKey) => void;
}) {
  return (
    <div className="segmented range-controls">
      {RANGE_OPTIONS.map((option) => (
        <button
          aria-pressed={value === option.key}
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MultiTrackView({
  dailyData,
  heightCm,
  layers,
  range,
}: {
  dailyData: DailyBodyData[];
  heightCm: number | null;
  layers: LayerState;
  range: RangeKey;
}) {
  if (dailyData.length === 0) return <p>当前范围内暂无身体记录。</p>;

  if (range === "week") {
    return (
      <>
        <div className="timeline-table-wrap">
          <table className="timeline-table">
            <thead>
              <tr>
                <th>日期</th>
                {dailyData.map((day) => (
                  <th key={day.date}>
                    {getWeekday(day.date)}
                    <span>{formatMonthDay(day.date)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {layers.weather ? (
                <TimelineRow
                  dailyData={dailyData}
                  label="身体天气"
                  render={(day) => formatWeatherCell(day.weather)}
                />
              ) : null}
              {layers.exercise ? (
                <TimelineRow
                  dailyData={dailyData}
                  label="运动"
                  render={(day) => formatExerciseCell(day.exercise)}
                />
              ) : null}
              {layers.menstrual ? (
                <TimelineRow
                  dailyData={dailyData}
                  label="经期"
                  render={(day) => formatMenstrualCell(day.menstrual)}
                />
              ) : null}
              {layers.measurement ? (
                <TimelineRow
                  dailyData={dailyData}
                  label="身体测量"
                  render={(day) => formatMeasurementCell(day.measurement, heightCm)}
                />
              ) : null}
            </tbody>
          </table>
        </div>
        <DailyCards dailyData={dailyData} heightCm={heightCm} layers={layers} />
      </>
    );
  }

  return (
    <div className="date-grid">
      {dailyData.map((day) => (
        <article className="date-cell" key={day.date}>
          <h3>{formatMonthDay(day.date)}</h3>
          <div className="date-cell-lines">{renderDayLines(day, layers, heightCm, true)}</div>
        </article>
      ))}
    </div>
  );
}

function TimelineRow({
  dailyData,
  label,
  render,
}: {
  dailyData: DailyBodyData[];
  label: string;
  render: (day: DailyBodyData) => ReactNode;
}) {
  return (
    <tr>
      <th>{label}</th>
      {dailyData.map((day) => (
        <td key={day.date}>{render(day)}</td>
      ))}
    </tr>
  );
}

function DailyCards({
  dailyData,
  heightCm,
  layers,
}: {
  dailyData: DailyBodyData[];
  heightCm: number | null;
  layers: LayerState;
}) {
  return (
    <div className="daily-card-list">
      {dailyData.map((day) => (
        <article className="daily-card" key={day.date}>
          <h3>
            {getWeekday(day.date)} {formatMonthDay(day.date)}
          </h3>
          <div>{renderDayLines(day, layers, heightCm)}</div>
        </article>
      ))}
    </div>
  );
}

function StatsPanel({ dailyData, layers }: { dailyData: DailyBodyData[]; layers: LayerState }) {
  const weatherDays = dailyData.filter((day) => day.weather?.weather_level !== null);
  const weatherStats = getWeatherStats(weatherDays);
  const showWeather = layers.weather;
  const showExercise = layers.exercise;
  const showMenstrual = layers.menstrual;
  const showMeasurement = layers.measurement;

  if (!showWeather) {
    return (
      <div className="stack">
        {showExercise ? <FactCard title="运动" body={`当前范围内有 ${dailyData.filter((day) => day.exercise).length} 个运动日。`} /> : null}
        {showMenstrual ? <FactCard title="经期" body={`当前范围内有 ${dailyData.filter((day) => day.menstrual?.inPeriod).length} 个经期日。`} /> : null}
        {showMeasurement ? <FactCard title="身体测量" body={`当前范围内有 ${dailyData.filter((day) => day.measurement).length} 个测量日。第一版只做同期展示。`} /> : null}
      </div>
    );
  }

  return (
    <div className="stack">
      <FactCard
        title="身体天气"
        body={
          weatherStats.validDays < 2
            ? "少于2天有效记录，数据不足。"
            : `有效 ${weatherStats.validDays} 天，平均 ${weatherStats.average} 分；晴朗或多云 ${weatherStats.clearOrCloudy} 天，阴天及以下 ${weatherStats.cloudyOrLower} 天。`
        }
      />
      {weatherStats.validDays > 0 ? (
        <FactCard title="天气分布" body={formatWeatherDistribution(weatherStats.distribution)} />
      ) : null}
      {weatherStats.topTags.length > 0 ? (
        <FactCard title="高频影响因素" body={weatherStats.topTags.join(" · ")} />
      ) : null}
      {showExercise ? <ExerciseWeatherStats dailyData={dailyData} /> : null}
      {showMenstrual ? <MenstrualWeatherStats dailyData={dailyData} /> : null}
      {showExercise && showMenstrual ? <CrossStats dailyData={dailyData} /> : null}
      {showMeasurement ? (
        <FactCard title="身体测量" body="身体测量第一版只做同期展示，不计算与身体天气之间的相关性。" />
      ) : null}
    </div>
  );
}

function ExerciseWeatherStats({ dailyData }: { dailyData: DailyBodyData[] }) {
  const exerciseWeatherDays = dailyData.filter((day) => day.exercise && day.weather?.weather_level);
  const nonExerciseWeatherDays = dailyData.filter((day) => !day.exercise && day.weather?.weather_level);
  const nextDayWeather = dailyData.filter((day, index) => {
    const previous = dailyData[index - 1];
    return previous?.exercise && day.weather?.weather_level;
  });

  return (
    <FactCard
      title="身体天气 + 运动"
      body={[
        `有天气记录的运动日 ${exerciseWeatherDays.length} 天。`,
        `运动日平均 ${formatAverage(exerciseWeatherDays)} 分，非运动日平均 ${formatAverage(nonExerciseWeatherDays)} 分。`,
        `运动日分布：${formatWeatherDistribution(countWeatherLevels(exerciseWeatherDays))}。`,
        `运动次日分布：${formatWeatherDistribution(countWeatherLevels(nextDayWeather))}。`,
      ].join(" ")}
    />
  );
}

function MenstrualWeatherStats({ dailyData }: { dailyData: DailyBodyData[] }) {
  const menstrualWeatherDays = dailyData.filter(
    (day) => day.menstrual?.inPeriod && day.weather?.weather_level,
  );
  const nonMenstrualWeatherDays = dailyData.filter(
    (day) => !day.menstrual?.inPeriod && day.weather?.weather_level,
  );
  const topTags = getTopTags(menstrualWeatherDays);

  return (
    <FactCard
      title="身体天气 + 经期"
      body={[
        `有天气记录的经期日 ${menstrualWeatherDays.length} 天。`,
        `经期日平均 ${formatAverage(menstrualWeatherDays)} 分，非经期日平均 ${formatAverage(nonMenstrualWeatherDays)} 分。`,
        `经期天气分布：${formatWeatherDistribution(countWeatherLevels(menstrualWeatherDays))}。`,
        topTags.length > 0 ? `经期高频影响因素：${topTags.join(" · ")}。` : "经期高频影响因素暂无。",
      ].join(" ")}
    />
  );
}

function CrossStats({ dailyData }: { dailyData: DailyBodyData[] }) {
  const crossDays = dailyData.filter(
    (day) => day.menstrual?.inPeriod && day.exercise && day.weather?.weather_level,
  );
  const detail = crossDays
    .map((day) => `${formatMonthDay(day.date)} ${formatWeatherCell(day.weather)}`)
    .join("；");
  return (
    <FactCard
      title="身体天气 + 运动 + 经期"
      body={
        crossDays.length < 3
          ? `经期日中有 ${crossDays.length} 天同时记录运动。当前交叉记录较少，暂不形成稳定观察。`
          : `经期日中有 ${crossDays.length} 天同时记录运动：${detail}。`
      }
    />
  );
}

function FactCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="placeholder-card">
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
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
      <p>
        {points[0]?.date} 至 {points[points.length - 1]?.date}
      </p>
    </div>
  );
}

function LatestMeasurementCard({
  measurement,
  heightCm,
}: {
  measurement: BodyMeasurementSummary | null;
  heightCm: number | null;
}) {
  if (!measurement) return <p>还没有身体测量记录。</p>;
  const meta = [measurement.source, measurement.condition].filter(Boolean).join(" · ");
  return (
    <article className="placeholder-card">
      <div>
        <h3>最近身体测量 · {formatReadableDate(measurement.occurred_on)}</h3>
        <p>{formatMeasurementSummary(measurement, heightCm)}</p>
        {meta ? <p>{meta}</p> : null}
      </div>
    </article>
  );
}

function HistoryList({
  items,
  empty,
  heightCm,
  onDelete,
}: {
  items: BodyHistoryItem[];
  empty: string;
  heightCm: number | null;
  onDelete: (record: BodyHistoryItem) => void;
}) {
  if (items.length === 0) return <p>{empty}</p>;
  return (
    <div className="stack">
      {items.map((record) => (
        <article className="placeholder-card" key={`${record.type}-${record.item.id}`}>
          <div>
            <h3>{getHistoryTitle(record)}</h3>
            <p>{getHistorySummary(record, heightCm)}</p>
            <p>
              {record.occurred_on} · {getHistoryMeta(record)}
            </p>
          </div>
          <div className="button-stack compact-actions">
            <button className="text-button danger-button" type="button" onClick={() => onDelete(record)}>
              删除
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function createDailyData(dates: string[], overview: BodyOverview): DailyBodyData[] {
  const weatherByDate = new Map<string, BodyStatusSummary>();
  for (const status of overview.statuses) {
    const existing = weatherByDate.get(status.occurred_on);
    if (!existing || status.updated_at.localeCompare(existing.updated_at) > 0) {
      weatherByDate.set(status.occurred_on, status);
    }
  }

  const exercisesByDate = groupExercisesByDate(overview.exercises);
  const measurementByDate = getRepresentativeMeasurements(overview.measurements);
  const menstrualByDate = getMenstrualDays(overview.menstrualContextRecords, dates);

  return dates.map((date) => ({
    date,
    weather: weatherByDate.get(date) ?? null,
    exercise: exercisesByDate.get(date) ?? null,
    menstrual: menstrualByDate.get(date) ?? null,
    measurement: measurementByDate.get(date) ?? null,
  }));
}

function groupExercisesByDate(exercises: ExerciseSummary[]): Map<string, ExerciseDaySummary> {
  const grouped = new Map<string, ExerciseSummary[]>();
  for (const exercise of exercises) {
    const list = grouped.get(exercise.occurred_on) ?? [];
    list.push(exercise);
    grouped.set(exercise.occurred_on, list);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, items]) => {
      const typeCounts = new Map<string, number>();
      for (const item of items) {
        typeCounts.set(item.exercise_type, (typeCounts.get(item.exercise_type) ?? 0) + 1);
      }
      const primaryType =
        Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
        "运动";
      return [
        date,
        {
          count: items.length,
          duration: items.reduce((sum, item) => sum + (item.duration_min ?? 0), 0),
          distance: Number(items.reduce((sum, item) => sum + (item.distance_km ?? 0), 0).toFixed(1)),
          primaryType,
        },
      ];
    }),
  );
}

function getRepresentativeMeasurements(
  measurements: BodyMeasurementSummary[],
): Map<string, BodyMeasurementSummary> {
  const grouped = new Map<string, BodyMeasurementSummary[]>();
  for (const measurement of measurements) {
    const list = grouped.get(measurement.occurred_on) ?? [];
    list.push(measurement);
    grouped.set(measurement.occurred_on, list);
  }

  return new Map(
    Array.from(grouped.entries()).map(([date, items]) => {
      const preferred =
        items.find((item) => item.condition?.includes("晨起空腹")) ??
        [...items].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))[0]!;
      return [date, preferred];
    }),
  );
}

function getRepresentativeTrend(
  measurements: BodyMeasurementSummary[],
  metric: TrendMetric,
  heightCm: number | null,
) {
  const representative = getRepresentativeMeasurements(measurements);
  return Array.from(representative.entries())
    .map(([date, item]) => {
      if (metric === "bmi") {
        const bmi = calculateBmi(item.weight_kg, heightCm);
        return bmi === null ? null : { date, value: Number(bmi.toFixed(1)) };
      }
      const value = item[metric];
      return value === null ? null : { date, value };
    })
    .filter((point): point is { date: string; value: number } => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getLatestMeasurement(measurements: BodyMeasurementSummary[]): BodyMeasurementSummary | null {
  return [...measurements].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0] ?? null;
}

function getMenstrualDays(records: MenstrualSummary[], dates: string[]): Map<string, MenstrualDay> {
  const dateSet = new Set(dates);
  const endDate = dates[dates.length - 1] ?? "";
  const sorted = [...records].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const result = new Map<string, MenstrualDay>();
  let openStart: MenstrualSummary | null = null;

  for (const record of sorted) {
    if (record.event_type === "start") {
      openStart = record;
      continue;
    }
    if (!openStart) {
      if (dateSet.has(record.occurred_on)) {
        result.set(record.occurred_on, { inPeriod: true, reliable: false, dayNumber: null });
      }
      continue;
    }
    fillMenstrualInterval(result, dates, openStart.occurred_on, record.occurred_on, true);
    openStart = null;
  }

  if (openStart) {
    fillMenstrualInterval(result, dates, openStart.occurred_on, endDate, true);
  }

  return result;
}

function fillMenstrualInterval(
  target: Map<string, MenstrualDay>,
  dates: string[],
  startDate: string,
  endDate: string,
  reliable: boolean,
) {
  for (const date of dates) {
    if (date < startDate || date > endDate) continue;
    target.set(date, {
      inPeriod: true,
      reliable,
      dayNumber: reliable ? daysBetween(startDate, date) + 1 : null,
    });
  }
}

function renderDayLines(
  day: DailyBodyData,
  layers: LayerState,
  heightCm: number | null,
  compact = false,
): ReactNode {
  const lines = [
    layers.weather ? <p key="weather">{formatWeatherCell(day.weather)}</p> : null,
    layers.exercise ? <p key="exercise">🏃 {formatExerciseCell(day.exercise)}</p> : null,
    layers.menstrual ? <p key="menstrual">🩸 {formatMenstrualCell(day.menstrual)}</p> : null,
    layers.measurement ? (
      <p key="measurement">⚖️ {formatMeasurementCell(day.measurement, heightCm, compact)}</p>
    ) : null,
  ].filter(Boolean);
  return lines.length > 0 ? lines : <p>—</p>;
}

function formatWeatherCell(status: BodyStatusSummary | null): string {
  const weather = getBodyWeatherOption(status?.weather_level ?? null);
  return weather ? `${weather.icon} ${weather.name}` : "—";
}

function formatExerciseCell(summary: ExerciseDaySummary | null): string {
  if (!summary) return "—";
  const duration = summary.duration > 0 ? `${summary.duration}m` : null;
  const distance = summary.distance > 0 ? `${summary.distance}km` : null;
  return [summary.count > 1 ? `${summary.count}次` : summary.primaryType, duration, distance]
    .filter(Boolean)
    .join(" · ");
}

function formatMenstrualCell(day: MenstrualDay | null): string {
  if (!day?.inPeriod) return "—";
  if (!day.reliable || day.dayNumber === null) return "经期";
  return `经期第${day.dayNumber}天`;
}

function formatMeasurementCell(
  item: BodyMeasurementSummary | null,
  heightCm: number | null,
  compact = false,
): string {
  if (!item) return "—";
  if (compact) {
    return item.weight_kg !== null ? `${item.weight_kg}kg` : "已测量";
  }
  const bmi = formatBmi(calculateBmi(item.weight_kg, heightCm));
  const weight = item.weight_kg !== null ? `${item.weight_kg}kg` : null;
  const bmiText = bmi ? `BMI ${bmi}` : null;
  const bodyFat = item.body_fat_percent !== null ? `体脂 ${item.body_fat_percent}%` : null;
  const muscle =
    item.skeletal_muscle_kg !== null ? `骨骼肌 ${item.skeletal_muscle_kg}kg` : null;
  return [weight, bmiText, bodyFat, muscle].filter(Boolean).join(" · ") || "已测量";
}

function formatMeasurementSummary(item: BodyMeasurementSummary, heightCm: number | null): string {
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

function formatTrendSummary(
  metric: TrendMetric,
  range: RangeKey,
  points: Array<{ date: string; value: number }>,
): string {
  const latest = points[points.length - 1];
  const latestText = latest ? ` · 最新 ${formatTrendValue(metric, latest.value)}` : "";
  return `${TREND_LABELS[metric]} · ${getRangeLabel(range)} · ${points.length}个有效日期${latestText}`;
}

function formatComparisonSummary(range: RangeKey, layers: LayerState): string {
  const selected = (Object.keys(LAYER_LABELS) as LayerKey[])
    .filter((key) => layers[key])
    .map((key) => LAYER_LABELS[key]);
  return `${getRangeLabel(range)} · ${selected.length > 0 ? selected.join("、") : "尚未选择显示内容"}`;
}

function formatHistorySummary(
  history: BodyHistoryItem[],
  latestMeasurement: BodyMeasurementSummary | null,
): string {
  if (history.length === 0) return "暂无身体历史记录";
  const weight =
    latestMeasurement?.weight_kg !== null && latestMeasurement?.weight_kg !== undefined
      ? ` · 最近体重${latestMeasurement.weight_kg} kg`
      : "";
  return `最近记录 ${formatReadableDate(history[0].occurred_on)} · 共${history.length}条${weight}`;
}

function formatTrendValue(metric: TrendMetric, value: number): string {
  if (metric === "bmi") return value.toFixed(1);
  if (metric === "body_fat_percent") return `${value}%`;
  return `${value}kg`;
}

function getRangeLabel(range: RangeKey): string {
  return RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "本月";
}

function getWeatherStats(weatherDays: DailyBodyData[]) {
  const distribution = countWeatherLevels(weatherDays);
  const values = weatherDays
    .map((day) => day.weather?.weather_level)
    .filter((level): level is BodyWeatherLevel => level !== null && level !== undefined);
  return {
    validDays: values.length,
    average: formatAverage(weatherDays),
    clearOrCloudy: values.filter((level) => level >= 4).length,
    cloudyOrLower: values.filter((level) => level <= 3).length,
    distribution,
    topTags: getTopTags(weatherDays),
  };
}

function countWeatherLevels(days: DailyBodyData[]): Map<BodyWeatherLevel, number> {
  const counts = new Map<BodyWeatherLevel, number>();
  for (const day of days) {
    const level = day.weather?.weather_level;
    if (level) counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return counts;
}

function formatWeatherDistribution(counts: Map<BodyWeatherLevel, number>): string {
  const text = BODY_WEATHER_LEVELS.map((option) => `${option.icon}${option.name} ${counts.get(option.level) ?? 0}天`).join("，");
  return text || "暂无天气记录";
}

function formatAverage(days: DailyBodyData[]): string {
  const values = days
    .map((day) => day.weather?.weather_level)
    .filter((level): level is BodyWeatherLevel => level !== null && level !== undefined);
  if (values.length === 0) return "暂无";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function getTopTags(days: DailyBodyData[]): string[] {
  const counts = new Map<string, number>();
  for (const day of days) {
    for (const tag of day.weather?.status_tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag, count]) => `${tag} ${count}`);
}

function getRangeBounds(range: RangeKey, allStartDate: string | null, today: string): DateBounds | null {
  if (range === "all") {
    if (!allStartDate) return null;
    return {
      start: allStartDate,
      end: allStartDate > today ? allStartDate : today,
    };
  }

  const end = parseLocalDate(today);
  const start = parseLocalDate(today);
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

function createDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  while (cursor <= end) {
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function getWeekday(date: string): string {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(parseLocalDate(date));
}

function formatMonthDay(date: string): string {
  const parsed = parseLocalDate(date);
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function formatReadableDate(date: string): string {
  const parsed = parseLocalDate(date);
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseLocalDate(end).getTime() - parseLocalDate(start).getTime()) / 86400000);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyOverview(): BodyOverview {
  return {
    measurements: [],
    exercises: [],
    menstrualRecords: [],
    menstrualContextRecords: [],
    statuses: [],
    history: [],
    exerciseTypes: [],
    hasMultipleMeasurementSources: false,
  };
}
