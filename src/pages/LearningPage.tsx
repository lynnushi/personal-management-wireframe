import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DataAccessPort,
  LearningDomainInput,
  LearningDomainOverview,
  LearningOverview,
  LearningProjectInput,
  LearningProjectStatus,
  LearningRangeKey,
  LearningRecordType,
} from "../app/ports";
import { PageSection } from "../components/PageSection";
import { PageProps } from "./pageTypes";

interface LearningPageProps extends PageProps {
  dataAccess: DataAccessPort;
}

const RANGE_OPTIONS: Array<{ key: LearningRangeKey; label: string }> = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "30d", label: "近30天" },
  { key: "year", label: "本年" },
  { key: "all", label: "全部数据" },
];

const PROJECT_STATUS_OPTIONS: Array<{ value: LearningProjectStatus; label: string }> = [
  { value: "planned", label: "计划中" },
  { value: "active", label: "进行中" },
  { value: "paused", label: "暂停" },
  { value: "completed", label: "已完成" },
];

export function LearningPage({ dataAccess }: LearningPageProps) {
  const [range, setRange] = useState<LearningRangeKey>("month");
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [domainDraft, setDomainDraft] = useState<LearningDomainInput | null>(null);
  const [projectDraft, setProjectDraft] = useState<LearningProjectInput | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ type: LearningRecordType; id: string } | null>(null);
  const [message, setMessage] = useState("学习模块用于整理目标、路径、Routine、执行和反馈。");

  useEffect(() => {
    void refresh();
  }, [range]);

  const refresh = async () => {
    setOverview(await dataAccess.getLearningOverview(range));
  };

  const domains = overview?.domains ?? [];
  const domainOptions = domains.map((item) => item.domain);
  const defaultDomainId = domainOptions[0]?.id ?? "";

  const startDomainCreate = () => {
    setDomainDraft({ name: "", description: null });
  };

  const startProjectCreate = () => {
    setProjectDraft({
      domain_id: defaultDomainId,
      title: "",
      status: "active",
      goal: null,
      current_level: null,
      target_state: null,
      motivation: null,
      start_date: formatLocalDate(new Date()),
      target_date: null,
      weekly_time_budget_min: null,
      constraints: null,
      preferred_methods: null,
    });
  };

  const saveDomain = async (event: FormEvent) => {
    event.preventDefault();
    if (!domainDraft) return;
    try {
      await dataAccess.saveLearningDomain(domainDraft);
      setDomainDraft(null);
      setLastDeleted(null);
      setMessage("学习领域已保存。");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "学习领域保存失败。");
    }
  };

  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectDraft) return;
    try {
      const id = await dataAccess.saveLearningProject(projectDraft);
      setProjectDraft(null);
      setLastDeleted(null);
      setMessage("学习项目已保存。");
      await refresh();
      openLearningProject(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "学习项目保存失败。");
    }
  };

  const softDelete = async (type: LearningRecordType, id: string) => {
    try {
      await dataAccess.softDeleteLearningRecord(type, id);
      setLastDeleted({ type, id });
      setMessage("学习记录已删除。");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    }
  };

  const restore = async () => {
    if (!lastDeleted) return;
    try {
      await dataAccess.restoreLearningRecord(lastDeleted.type, lastDeleted.id);
      setLastDeleted(null);
      setMessage("学习记录已恢复。");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "恢复失败。");
    }
  };

  const rangeLabel = useMemo(
    () => RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "本月",
    [range],
  );

  return (
    <>
      <PageSection title="学习概览" description={`当前范围：${rangeLabel}`}>
        <div className="segmented range-controls">
          {RANGE_OPTIONS.map((option) => (
            <button
              aria-pressed={range === option.key}
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="metric-row learning-metrics">
          <div><strong>{overview?.stats.studyDays ?? 0} 天</strong><span>学习天数</span></div>
          <div><strong>{overview?.stats.totalMinutes ?? 0} 分钟</strong><span>累计学习分钟</span></div>
          <div><strong>{overview?.stats.recordCount ?? 0}</strong><span>学习记录数</span></div>
          <div><strong>{overview?.stats.activeProjectCount ?? 0}</strong><span>进行中项目数</span></div>
          <div><strong>{overview?.stats.assessmentCount ?? 0}</strong><span>检验次数</span></div>
        </div>
        <div className="status-action-row">
          <p className="status-text">{message}</p>
          {lastDeleted ? (
            <button className="text-button" type="button" onClick={restore}>
              撤销
            </button>
          ) : null}
        </div>
      </PageSection>

      <PageSection title="学习领域">
        <div className="action-row">
          <button type="button" onClick={startDomainCreate}>新增领域</button>
        </div>
        {domainDraft ? (
          <form className="form-stack inline-form" onSubmit={saveDomain}>
            <label>
              领域名称
              <input
                value={domainDraft.name}
                onChange={(event) => setDomainDraft({ ...domainDraft, name: event.target.value })}
              />
            </label>
            <label>
              说明
              <textarea
                value={domainDraft.description ?? ""}
                onChange={(event) => setDomainDraft({ ...domainDraft, description: event.target.value })}
              />
            </label>
            <div className="action-row">
              <button type="submit">保存领域</button>
              <button className="ghost-button" type="button" onClick={() => setDomainDraft(null)}>取消</button>
            </div>
          </form>
        ) : null}
        {domains.length === 0 ? (
          <p>还没有学习领域。先从一个你真正想提升的能力开始。</p>
        ) : (
          <div className="stack">
            {domains.map((item) => (
              <DomainCard
                item={item}
                key={item.domain.id}
                onDelete={() => softDelete("domain", item.domain.id)}
                onEdit={() => setDomainDraft({
                  id: item.domain.id,
                  name: item.domain.name,
                  description: item.domain.description,
                })}
              />
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title="进行中的项目">
        <div className="action-row">
          <button disabled={domainOptions.length === 0} type="button" onClick={startProjectCreate}>
            新增学习项目
          </button>
          {domainOptions.length === 0 ? <p>先创建一个学习领域，再建立项目。</p> : null}
        </div>
        {projectDraft ? (
          <form className="form-stack inline-form" onSubmit={saveProject}>
            <div className="field-grid">
              <label>
                所属领域
                <select
                  value={projectDraft.domain_id}
                  onChange={(event) => setProjectDraft({ ...projectDraft, domain_id: event.target.value })}
                >
                  {domainOptions.map((domain) => (
                    <option key={domain.id} value={domain.id}>{domain.name}</option>
                  ))}
                </select>
              </label>
              <label>
                项目状态
                <select
                  value={projectDraft.status}
                  onChange={(event) =>
                    setProjectDraft({ ...projectDraft, status: event.target.value as LearningProjectStatus })
                  }
                >
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                开始日期
                <input
                  max={formatLocalDate(new Date())}
                  type="date"
                  value={projectDraft.start_date}
                  onChange={(event) => setProjectDraft({ ...projectDraft, start_date: event.target.value })}
                />
              </label>
            </div>
            <label>
              项目名称
              <input
                value={projectDraft.title}
                onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })}
              />
            </label>
            <div className="action-row">
              <button type="submit">保存并进入详情</button>
              <button className="ghost-button" type="button" onClick={() => setProjectDraft(null)}>取消</button>
            </div>
          </form>
        ) : null}
        {(overview?.projects.length ?? 0) === 0 ? (
          <p>还没有阶段学习项目。为目标建立一条可以调整的学习路径。</p>
        ) : (
          <div className="stack">
            {overview?.projects.map((card) => (
              <article className="placeholder-card learning-card" key={card.project.id}>
                <div>
                  <h3>{card.project.title}</h3>
                  <p>{card.domain?.name ?? "未设置领域"} · {formatProjectStatus(card.project.status)}</p>
                  <p>当前阶段：{card.activeStage?.title ?? "暂无 active 阶段"}</p>
                  <p>本月 {card.monthMinutes} 分钟 · 最近学习 {card.recentStudyDate ?? "暂无"}</p>
                  <p>下一步：{card.recentNextStep ?? "暂无"}</p>
                  <p>最近检验：{card.recentAssessmentDate ?? "暂无"}</p>
                </div>
                <div className="button-stack compact-actions">
                  <button type="button" onClick={() => openLearningProject(card.project.id)}>进入详情</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title="最近学习记录">
        {(overview?.recentRecords.length ?? 0) === 0 ? (
          <p>还没有学习记录。第一次执行后，Loom会开始整理你的投入和下一步。</p>
        ) : (
          <div className="stack">
            {overview?.recentRecords.map(({ record, project }) => (
              <article className="placeholder-card learning-card" key={record.id}>
                <div>
                  <h3>{record.occurred_on} · {project?.title ?? "未知项目"}</h3>
                  <p>{record.duration_min ?? 0} 分钟 · {formatCompletionLevel(record.completion_level)}</p>
                  <p>内容：{record.content ?? "未填写"}</p>
                  <p>产出：{record.output ?? "未填写"}</p>
                  <p>下一步：{record.next_step ?? "未填写"}</p>
                </div>
                <div className="button-stack compact-actions">
                  <button className="text-button danger-button" type="button" onClick={() => softDelete("record", record.id)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title="最近检验与反馈">
        {(overview?.recentAssessments.length ?? 0) === 0 ? (
          <p>还没有检验记录。学习一段时间后，用实际任务确认自己是否真正掌握。</p>
        ) : (
          <div className="stack">
            {overview?.recentAssessments.map(({ assessment, project }) => (
              <article className="placeholder-card learning-card" key={assessment.id}>
                <div>
                  <h3>{assessment.occurred_on} · {project?.title ?? "未知项目"}</h3>
                  <p>{formatAssessmentType(assessment.assessment_type)} · {assessment.title}</p>
                  <p>结果：{assessment.result ?? "未填写"}</p>
                  <p>暴露的问题：{assessment.exposed_problems ?? "未填写"}</p>
                  <p>建议调整：{assessment.proposed_adjustment ?? "未填写"}</p>
                </div>
                <div className="button-stack compact-actions">
                  <button className="text-button danger-button" type="button" onClick={() => softDelete("assessment", assessment.id)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </>
  );
}

function DomainCard({
  item,
  onDelete,
  onEdit,
}: {
  item: LearningDomainOverview;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="placeholder-card learning-card">
      <div>
        <h3>{item.domain.name}</h3>
        <p>{item.domain.description ?? "暂无说明"}</p>
        <p>进行中项目 {item.activeProjectCount} 个 · 本月 {item.monthMinutes} 分钟 · 最近学习 {item.recentStudyDate ?? "暂无"}</p>
      </div>
      <div className="button-stack compact-actions">
        <button className="text-button" type="button" onClick={onEdit}>编辑</button>
        <button className="text-button danger-button" type="button" onClick={onDelete}>删除</button>
      </div>
    </article>
  );
}

export function openLearningProject(projectId: string) {
  window.location.hash = `/learning/project?id=${encodeURIComponent(projectId)}`;
}

export function formatProjectStatus(status: LearningProjectStatus): string {
  return PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function formatCompletionLevel(level: string): string {
  if (level === "minimum") return "最低版本";
  if (level === "standard") return "标准版本";
  if (level === "extra") return "超出标准";
  return "自由学习";
}

export function formatAssessmentType(type: string): string {
  const labels: Record<string, string> = {
    test: "测试题",
    recall: "回忆",
    explanation: "复述或讲解",
    writing: "写作",
    speaking: "口头表达",
    practical_task: "实际任务或作品",
    simulation: "模拟场景",
    other: "其他",
  };
  return labels[type] ?? type;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
