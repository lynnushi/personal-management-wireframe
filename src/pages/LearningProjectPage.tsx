import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DataAccessPort,
  LearningAssessmentInput,
  LearningAssessmentType,
  LearningCompletionLevel,
  LearningPathStageSummary,
  LearningProjectDetail,
  LearningProjectInput,
  LearningProjectStatus,
  LearningRecordInput,
  LearningRecordType,
  LearningResourceInput,
  LearningResourceStatus,
  LearningResourceType,
  LearningRoutineFrequency,
  LearningRoutineInput,
  LearningStageInput,
  LearningStageStatus,
} from "../app/ports";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { PageSection } from "../components/PageSection";
import {
  formatAssessmentType,
  formatCompletionLevel,
  formatProjectStatus,
} from "./LearningPage";
import { PageProps } from "./pageTypes";

interface LearningProjectPageProps extends PageProps {
  dataAccess: DataAccessPort;
}

const PROJECT_STATUS_OPTIONS: Array<{ value: LearningProjectStatus; label: string }> = [
  { value: "planned", label: "计划中" },
  { value: "active", label: "进行中" },
  { value: "paused", label: "暂停" },
  { value: "completed", label: "已完成" },
];

const STAGE_STATUS_OPTIONS: Array<{ value: LearningStageStatus; label: string }> = [
  { value: "pending", label: "未开始" },
  { value: "active", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "skipped", label: "跳过" },
];

const RESOURCE_TYPE_OPTIONS: Array<{ value: LearningResourceType; label: string }> = [
  { value: "book", label: "书籍" },
  { value: "course", label: "课程" },
  { value: "article", label: "文章" },
  { value: "video", label: "视频" },
  { value: "tool", label: "工具" },
  { value: "exercise", label: "练习" },
  { value: "other", label: "其他" },
];

const RESOURCE_STATUS_OPTIONS: Array<{ value: LearningResourceStatus; label: string }> = [
  { value: "evaluating", label: "待评估" },
  { value: "active", label: "正在使用" },
  { value: "paused", label: "暂停" },
  { value: "completed", label: "已完成" },
  { value: "rejected", label: "已淘汰" },
];

const ROUTINE_FREQUENCY_OPTIONS: Array<{ value: LearningRoutineFrequency; label: string }> = [
  { value: "daily", label: "每日" },
  { value: "weekdays", label: "工作日" },
  { value: "weekly", label: "每周" },
];

const COMPLETION_LEVEL_OPTIONS: Array<{ value: LearningCompletionLevel; label: string }> = [
  { value: "minimum", label: "最低版本" },
  { value: "standard", label: "标准版本" },
  { value: "extra", label: "超出标准" },
  { value: "freeform", label: "自由学习" },
];

const ASSESSMENT_TYPE_OPTIONS: Array<{ value: LearningAssessmentType; label: string }> = [
  { value: "test", label: "测试题" },
  { value: "recall", label: "回忆" },
  { value: "explanation", label: "复述或讲解" },
  { value: "writing", label: "写作" },
  { value: "speaking", label: "口头表达" },
  { value: "practical_task", label: "实际任务或作品" },
  { value: "simulation", label: "模拟场景" },
  { value: "other", label: "其他" },
];

export function LearningProjectPage({ dataAccess, navigate }: LearningProjectPageProps) {
  const projectId = useMemo(() => getProjectIdFromHash(), []);
  const [detail, setDetail] = useState<LearningProjectDetail | null>(null);
  const [message, setMessage] = useState("学习项目数据保存在本地 IndexedDB。");
  const [lastDeleted, setLastDeleted] = useState<{ type: LearningRecordType; id: string } | null>(null);
  const [projectDraft, setProjectDraft] = useState<LearningProjectInput | null>(null);
  const [stageDraft, setStageDraft] = useState<LearningStageInput | null>(null);
  const [resourceDraft, setResourceDraft] = useState<LearningResourceInput | null>(null);
  const [routineDraft, setRoutineDraft] = useState<LearningRoutineInput | null>(null);
  const [recordDraft, setRecordDraft] = useState<LearningRecordInput | null>(null);
  const [assessmentDraft, setAssessmentDraft] = useState<LearningAssessmentInput | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => {
    void refresh();
  }, [projectId]);

  const refresh = async () => {
    if (!projectId) return;
    setDetail(await dataAccess.getLearningProjectDetail(projectId));
  };

  if (!projectId) {
    return (
      <PageSection title="学习项目">
        <p>缺少项目 ID。请从学习页进入具体项目。</p>
        <button type="button" onClick={() => navigate("/learning")}>返回学习页</button>
      </PageSection>
    );
  }

  if (!detail) {
    return (
      <PageSection title="学习项目">
        <p>未找到这个学习项目，或项目已被删除。</p>
        <button type="button" onClick={() => navigate("/learning")}>返回学习页</button>
      </PageSection>
    );
  }

  const refreshWithMessage = async (nextMessage: string) => {
    await refresh();
    setMessage(nextMessage);
  };

  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectDraft) return;
    try {
      await dataAccess.saveLearningProject(projectDraft);
      setProjectDraft(null);
      await refreshWithMessage("项目目标与约束已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "项目保存失败。");
    }
  };

  const saveStage = async (event: FormEvent) => {
    event.preventDefault();
    if (!stageDraft) return;
    try {
      await dataAccess.saveLearningStage(stageDraft);
      setStageDraft(null);
      await refreshWithMessage("学习阶段已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "学习阶段保存失败。");
    }
  };

  const saveResource = async (event: FormEvent) => {
    event.preventDefault();
    if (!resourceDraft) return;
    try {
      await dataAccess.saveLearningResource(resourceDraft);
      setResourceDraft(null);
      await refreshWithMessage("学习资源已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "学习资源保存失败。");
    }
  };

  const saveRoutine = async (event: FormEvent) => {
    event.preventDefault();
    if (!routineDraft) return;
    try {
      await dataAccess.saveLearningRoutine(routineDraft);
      setRoutineDraft(null);
      await refreshWithMessage("Daily Routine 已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Daily Routine 保存失败。");
    }
  };

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (!recordDraft) return;
    try {
      await dataAccess.saveLearningRecord(recordDraft);
      setRecordDraft(null);
      await refreshWithMessage("学习记录已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "学习记录保存失败。");
    }
  };

  const saveAssessment = async (event: FormEvent) => {
    event.preventDefault();
    if (!assessmentDraft) return;
    try {
      await dataAccess.saveLearningAssessment(assessmentDraft);
      setAssessmentDraft(null);
      await refreshWithMessage("检验与反馈已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检验与反馈保存失败。");
    }
  };

  const softDelete = async (type: LearningRecordType, id: string) => {
    try {
      await dataAccess.softDeleteLearningRecord(type, id);
      setLastDeleted({ type, id });
      await refreshWithMessage("学习记录已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    }
  };

  const restore = async () => {
    if (!lastDeleted) return;
    try {
      await dataAccess.restoreLearningRecord(lastDeleted.type, lastDeleted.id);
      setLastDeleted(null);
      await refreshWithMessage("学习记录已恢复。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "恢复失败。");
    }
  };

  const moveStage = async (stageId: string, direction: "up" | "down") => {
    await dataAccess.moveLearningStage(stageId, direction);
    await refreshWithMessage("学习阶段顺序已更新。");
  };

  const generatePrompt = async () => {
    try {
      setAiPrompt(await dataAccess.generateLearningAiPrompt(projectId));
      setMessage("AI分析内容已生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI分析内容生成失败。");
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setMessage("已复制给AI分析。");
    } catch {
      setMessage("复制失败，可以手动选择文本复制。");
    }
  };

  return (
    <>
      <PageSection title={detail.project.title} description={`${detail.domain?.name ?? "未设置领域"} · ${formatProjectStatus(detail.project.status)}`}>
        <div className="status-action-row">
          <p className="status-text">{message}</p>
          {lastDeleted ? <button className="text-button" type="button" onClick={restore}>撤销</button> : null}
        </div>
      </PageSection>

      <CollapsibleSection
        defaultExpanded
        summary={`${detail.domain?.name ?? "未设置领域"} · ${formatProjectStatus(detail.project.status)}`}
        title="项目目标与约束"
      >
        <div className="module-stack">
          <ProjectSummary detail={detail} />
          <div className="action-row">
            <button type="button" onClick={() => setProjectDraft(createProjectDraft(detail))}>编辑目标与约束</button>
          </div>
          {projectDraft ? (
            <ProjectForm
              detail={detail}
              draft={projectDraft}
              setDraft={setProjectDraft}
              onCancel={() => setProjectDraft(null)}
              onSubmit={saveProject}
            />
          ) : null}
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultExpanded summary={`${detail.stages.length} 个阶段`} title="学习路径">
        <div className="module-stack">
          <div className="action-row">
            <button type="button" onClick={() => setStageDraft(createStageDraft(projectId))}>新增阶段</button>
          </div>
          {stageDraft ? (
            <StageForm draft={stageDraft} setDraft={setStageDraft} onCancel={() => setStageDraft(null)} onSubmit={saveStage} />
          ) : null}
          {detail.stages.length === 0 ? (
            <p>还没有学习路径。先写下你认为合理的第一阶段，后续可以随时调整。</p>
          ) : (
            <div className="stack">
              {detail.stages.map((stage, index) => (
                <article className="placeholder-card learning-card" key={stage.id}>
                  <div>
                    <h3>{stage.sort_order}. {stage.title}</h3>
                    <p>{formatStageStatus(stage.status)}</p>
                    <p>阶段目标：{stage.stage_goal ?? "未填写"}</p>
                    <p>完成标准：{stage.completion_criteria ?? "未填写"}</p>
                  </div>
                  <div className="button-stack compact-actions">
                    <button className="text-button" type="button" onClick={() => setStageDraft(createStageDraft(projectId, stage))}>编辑</button>
                    <button className="text-button" disabled={index === 0} type="button" onClick={() => moveStage(stage.id, "up")}>上移</button>
                    <button className="text-button" disabled={index === detail.stages.length - 1} type="button" onClick={() => moveStage(stage.id, "down")}>下移</button>
                    <button className="text-button danger-button" type="button" onClick={() => softDelete("stage", stage.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultExpanded summary={`${detail.routines.length} 条 Routine`} title="Daily Routine">
        <div className="module-stack">
          <div className="action-row">
            <button type="button" onClick={() => setRoutineDraft(createRoutineDraft(projectId))}>新增 Routine</button>
          </div>
          {routineDraft ? (
            <RoutineForm draft={routineDraft} setDraft={setRoutineDraft} onCancel={() => setRoutineDraft(null)} onSubmit={saveRoutine} />
          ) : null}
          {detail.routines.length === 0 ? (
            <p>还没有 Daily Routine。为这个项目设置一个最低可执行版本，降低重新开始的成本。</p>
          ) : (
            <div className="stack">
              {detail.routines.map((routine) => (
                <article className="placeholder-card learning-card" key={routine.id}>
                  <div>
                    <h3>{routine.title}</h3>
                    <p>{formatRoutineFrequency(routine.frequency_type)} · {routine.is_active ? "启用" : "停用"} · 每周目标 {routine.target_count_per_week ?? "未设置"} 次</p>
                    <p>标准版本：{routine.standard_action ?? "未填写"}</p>
                    <p>最低版本：{routine.minimum_action ?? "未填写"}</p>
                    <p>预计时长：{routine.estimated_minutes ?? "未设置"} 分钟</p>
                  </div>
                  <div className="button-stack compact-actions">
                    <button className="text-button" type="button" onClick={() => setRoutineDraft(createRoutineDraft(projectId, routine))}>编辑</button>
                    <button className="text-button" type="button" onClick={() => dataAccess.saveLearningRoutine({ ...createRoutineDraft(projectId, routine), is_active: !routine.is_active }).then(() => refreshWithMessage("Routine 状态已更新。"))}>
                      {routine.is_active ? "停用" : "启用"}
                    </button>
                    <button className="text-button danger-button" type="button" onClick={() => softDelete("routine", routine.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultExpanded={false} summary={`${detail.resources.length} 条资源`} title="学习资源">
        <div className="module-stack">
          <div className="action-row">
            <button type="button" onClick={() => setResourceDraft(createResourceDraft(projectId))}>新增资源</button>
          </div>
          {resourceDraft ? (
            <ResourceForm draft={resourceDraft} setDraft={setResourceDraft} onCancel={() => setResourceDraft(null)} onSubmit={saveResource} />
          ) : null}
          {detail.resources.length === 0 ? (
            <p>还没有学习资源。先记录你准备用来学习的资料，再根据实际体验筛选。</p>
          ) : (
            <div className="stack">
              {detail.resources.map((resource) => (
                <article className="placeholder-card learning-card" key={resource.id}>
                  <div>
                    <h3>{resource.name}</h3>
                    <p>{formatResourceType(resource.resource_type)} · {formatResourceStatus(resource.status)}</p>
                    <p>用途：{resource.purpose ?? "未填写"}</p>
                    {resource.url ? <p><a href={resource.url} rel="noreferrer" target="_blank">{resource.url}</a></p> : null}
                    <p>评价：{resource.evaluation ?? "未填写"}</p>
                    <p>备注：{resource.note ?? "未填写"}</p>
                  </div>
                  <div className="button-stack compact-actions">
                    <button className="text-button" type="button" onClick={() => setResourceDraft(createResourceDraft(projectId, resource))}>编辑</button>
                    <button className="text-button danger-button" type="button" onClick={() => softDelete("resource", resource.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultExpanded={false} summary={`${detail.records.length} 条记录`} title="学习记录">
        <div className="module-stack">
          <div className="action-row">
            <button type="button" onClick={() => setRecordDraft(createRecordDraft(projectId))}>新增学习记录</button>
          </div>
          {recordDraft ? (
            <RecordForm detail={detail} draft={recordDraft} setDraft={setRecordDraft} onCancel={() => setRecordDraft(null)} onSubmit={saveRecord} />
          ) : null}
          {detail.records.length === 0 ? (
            <p>还没有学习记录。第一次执行后，Loom会开始整理你的投入和下一步。</p>
          ) : (
            <div className="stack">
              {detail.records.map((record) => (
                <article className="placeholder-card learning-card" key={record.id}>
                  <div>
                    <h3>{record.occurred_on} · {formatCompletionLevel(record.completion_level)}</h3>
                    <p>{record.duration_min ?? 0} 分钟 · {record.quantity_value ?? "未记录"} {record.quantity_unit ?? ""}</p>
                    <p>内容：{record.content ?? "未填写"}</p>
                    <p>产出：{record.output ?? "未填写"}</p>
                    <p>困难：{record.difficulty_tags.join(" · ") || "未填写"}</p>
                    <p>反馈：{record.feedback ?? "未填写"}</p>
                    <p>下一步：{record.next_step ?? "未填写"}</p>
                  </div>
                  <div className="button-stack compact-actions">
                    <button className="text-button" type="button" onClick={() => setRecordDraft(createRecordDraft(projectId, record))}>编辑</button>
                    <button className="text-button danger-button" type="button" onClick={() => softDelete("record", record.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultExpanded={false} summary={`${detail.assessments.length} 条检验`} title="检验与反馈">
        <div className="module-stack">
          <div className="action-row">
            <button type="button" onClick={() => setAssessmentDraft(createAssessmentDraft(projectId))}>新增检验</button>
          </div>
          {assessmentDraft ? (
            <AssessmentForm detail={detail} draft={assessmentDraft} setDraft={setAssessmentDraft} onCancel={() => setAssessmentDraft(null)} onSubmit={saveAssessment} />
          ) : null}
          {detail.assessments.length === 0 ? (
            <p>还没有检验记录。学习一段时间后，用实际任务确认自己是否真正掌握。</p>
          ) : (
            <div className="stack">
              {detail.assessments.map((assessment) => (
                <article className="placeholder-card learning-card" key={assessment.id}>
                  <div>
                    <h3>{assessment.occurred_on} · {assessment.title}</h3>
                    <p>{formatAssessmentType(assessment.assessment_type)} · 分数 {assessment.score ?? "未填"} / {assessment.score_max ?? "未填"}</p>
                    <p>内容：{assessment.content ?? "未填写"}</p>
                    <p>结果：{assessment.result ?? "未填写"}</p>
                    <p>暴露的问题：{assessment.exposed_problems ?? "未填写"}</p>
                    <p>反思：{assessment.reflection ?? "未填写"}</p>
                    <p>建议调整：{assessment.proposed_adjustment ?? "未填写"}</p>
                  </div>
                  <div className="button-stack compact-actions">
                    <button className="text-button" type="button" onClick={() => setAssessmentDraft(createAssessmentDraft(projectId, assessment))}>编辑</button>
                    <button className="text-button danger-button" type="button" onClick={() => softDelete("assessment", assessment.id)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection defaultExpanded={false} summary={aiPrompt ? "已生成，可复制" : "生成可复制给 AI 的上下文"} title="AI分析包">
        <div className="module-stack">
          <div className="action-row">
            <button type="button" onClick={generatePrompt}>生成AI分析内容</button>
            <button disabled={!aiPrompt} type="button" onClick={copyPrompt}>复制给AI分析</button>
          </div>
          <textarea className="ai-prompt-box" readOnly value={aiPrompt} />
        </div>
      </CollapsibleSection>
    </>
  );
}

function ProjectSummary({ detail }: { detail: LearningProjectDetail }) {
  return (
    <article className="placeholder-card learning-card">
      <div>
        <h3>{detail.project.title}</h3>
        <p>领域：{detail.domain?.name ?? "未设置"} · 状态：{formatProjectStatus(detail.project.status)}</p>
        <p>目标：{detail.project.goal ?? "未填写"}</p>
        <p>当前水平：{detail.project.current_level ?? "未填写"}</p>
        <p>目标状态：{detail.project.target_state ?? "未填写"}</p>
        <p>动机：{detail.project.motivation ?? "未填写"}</p>
        <p>日期：{detail.project.start_date} 至 {detail.project.target_date ?? "未设置"}</p>
        <p>每周可投入：{detail.project.weekly_time_budget_min ?? "未设置"} 分钟</p>
        <p>现实限制：{detail.project.constraints ?? "未填写"}</p>
        <p>学习偏好：{detail.project.preferred_methods ?? "未填写"}</p>
      </div>
    </article>
  );
}

function ProjectForm({ detail, draft, setDraft, onSubmit, onCancel }: {
  detail: LearningProjectDetail;
  draft: LearningProjectInput;
  setDraft: (draft: LearningProjectInput) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="form-stack inline-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <label>所属领域<select value={draft.domain_id} onChange={(event) => setDraft({ ...draft, domain_id: event.target.value })}>{detail.domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</select></label>
        <label>状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as LearningProjectStatus })}>{PROJECT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>开始日期<input type="date" value={draft.start_date} onChange={(event) => setDraft({ ...draft, start_date: event.target.value })} /></label>
      </div>
      <label>项目名称<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>目标<textarea value={draft.goal ?? ""} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} /></label>
      <div className="field-grid">
        <label>当前水平<textarea value={draft.current_level ?? ""} onChange={(event) => setDraft({ ...draft, current_level: event.target.value })} /></label>
        <label>目标状态<textarea value={draft.target_state ?? ""} onChange={(event) => setDraft({ ...draft, target_state: event.target.value })} /></label>
      </div>
      <div className="field-grid">
        <label>目标日期<input type="date" value={draft.target_date ?? ""} onChange={(event) => setDraft({ ...draft, target_date: event.target.value || null })} /></label>
        <label>每周可投入分钟<input min="0" type="number" value={draft.weekly_time_budget_min ?? ""} onChange={(event) => setDraft({ ...draft, weekly_time_budget_min: toNumberOrNull(event.target.value) })} /></label>
      </div>
      <label>学习动机<textarea value={draft.motivation ?? ""} onChange={(event) => setDraft({ ...draft, motivation: event.target.value })} /></label>
      <label>现实限制<textarea value={draft.constraints ?? ""} onChange={(event) => setDraft({ ...draft, constraints: event.target.value })} /></label>
      <label>学习偏好<textarea value={draft.preferred_methods ?? ""} onChange={(event) => setDraft({ ...draft, preferred_methods: event.target.value })} /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function StageForm({ draft, setDraft, onSubmit, onCancel }: {
  draft: LearningStageInput;
  setDraft: (draft: LearningStageInput) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="form-stack inline-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <label>阶段标题<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as LearningStageStatus })}>{STAGE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      <label>阶段目标<textarea value={draft.stage_goal ?? ""} onChange={(event) => setDraft({ ...draft, stage_goal: event.target.value })} /></label>
      <label>完成标准<textarea value={draft.completion_criteria ?? ""} onChange={(event) => setDraft({ ...draft, completion_criteria: event.target.value })} /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function ResourceForm({ draft, setDraft, onSubmit, onCancel }: {
  draft: LearningResourceInput;
  setDraft: (draft: LearningResourceInput) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="form-stack inline-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <label>资源名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>类型<select value={draft.resource_type} onChange={(event) => setDraft({ ...draft, resource_type: event.target.value as LearningResourceType })}>{RESOURCE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as LearningResourceStatus })}>{RESOURCE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      <label>用途<textarea value={draft.purpose ?? ""} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} /></label>
      <label>链接<input value={draft.url ?? ""} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
      <label>评价<textarea value={draft.evaluation ?? ""} onChange={(event) => setDraft({ ...draft, evaluation: event.target.value })} /></label>
      <label>备注<textarea value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function RoutineForm({ draft, setDraft, onSubmit, onCancel }: {
  draft: LearningRoutineInput;
  setDraft: (draft: LearningRoutineInput) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="form-stack inline-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <label>名称<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>频率<select value={draft.frequency_type} onChange={(event) => setDraft({ ...draft, frequency_type: event.target.value as LearningRoutineFrequency })}>{ROUTINE_FREQUENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>每周目标次数<input min="1" type="number" value={draft.target_count_per_week ?? ""} onChange={(event) => setDraft({ ...draft, target_count_per_week: toNumberOrNull(event.target.value) })} /></label>
      </div>
      <label>标准版本<textarea value={draft.standard_action ?? ""} onChange={(event) => setDraft({ ...draft, standard_action: event.target.value })} /></label>
      <label>最低版本<textarea value={draft.minimum_action ?? ""} onChange={(event) => setDraft({ ...draft, minimum_action: event.target.value })} /></label>
      <div className="field-grid">
        <label>预计时长<input min="0" type="number" value={draft.estimated_minutes ?? ""} onChange={(event) => setDraft({ ...draft, estimated_minutes: toNumberOrNull(event.target.value) })} /></label>
        <label>启用状态<select value={draft.is_active ? "true" : "false"} onChange={(event) => setDraft({ ...draft, is_active: event.target.value === "true" })}><option value="true">启用</option><option value="false">停用</option></select></label>
      </div>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function RecordForm({ detail, draft, setDraft, onSubmit, onCancel }: {
  detail: LearningProjectDetail;
  draft: LearningRecordInput;
  setDraft: (draft: LearningRecordInput) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="form-stack inline-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <label>日期<input max={formatLocalDate(new Date())} type="date" value={draft.occurred_on} onChange={(event) => setDraft({ ...draft, occurred_on: event.target.value })} /></label>
        <label>时间<input type="time" value={draft.occurred_time} onChange={(event) => setDraft({ ...draft, occurred_time: event.target.value })} /></label>
        <label>完成等级<select value={draft.completion_level} onChange={(event) => setDraft({ ...draft, completion_level: event.target.value as LearningCompletionLevel })}>{COMPLETION_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      <div className="field-grid">
        <label>关联阶段<select value={draft.stage_id ?? ""} onChange={(event) => setDraft({ ...draft, stage_id: event.target.value || null })}><option value="">不关联</option>{detail.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select></label>
        <label>关联 Routine<select value={draft.routine_id ?? ""} onChange={(event) => setDraft({ ...draft, routine_id: event.target.value || null })}><option value="">不关联</option>{detail.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.title}</option>)}</select></label>
      </div>
      <div className="field-grid">
        <label>时长<input min="0" type="number" value={draft.duration_min ?? ""} onChange={(event) => setDraft({ ...draft, duration_min: toNumberOrNull(event.target.value) })} /></label>
        <label>数量<input min="0" type="number" value={draft.quantity_value ?? ""} onChange={(event) => setDraft({ ...draft, quantity_value: toNumberOrNull(event.target.value) })} /></label>
        <label>数量单位<input value={draft.quantity_unit ?? ""} onChange={(event) => setDraft({ ...draft, quantity_unit: event.target.value })} /></label>
      </div>
      <label>学习内容<textarea value={draft.content ?? ""} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
      <label>学习产出<textarea value={draft.output ?? ""} onChange={(event) => setDraft({ ...draft, output: event.target.value })} /></label>
      <label>困难标签<input value={draft.difficulty_tags.join("，")} onChange={(event) => setDraft({ ...draft, difficulty_tags: splitTags(event.target.value) })} /></label>
      <label>反馈<textarea value={draft.feedback ?? ""} onChange={(event) => setDraft({ ...draft, feedback: event.target.value })} /></label>
      <label>下一步<textarea value={draft.next_step ?? ""} onChange={(event) => setDraft({ ...draft, next_step: event.target.value })} /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function AssessmentForm({ detail, draft, setDraft, onSubmit, onCancel }: {
  detail: LearningProjectDetail;
  draft: LearningAssessmentInput;
  setDraft: (draft: LearningAssessmentInput) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="form-stack inline-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <label>日期<input max={formatLocalDate(new Date())} type="date" value={draft.occurred_on} onChange={(event) => setDraft({ ...draft, occurred_on: event.target.value })} /></label>
        <label>类型<select value={draft.assessment_type} onChange={(event) => setDraft({ ...draft, assessment_type: event.target.value as LearningAssessmentType })}>{ASSESSMENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>关联阶段<select value={draft.stage_id ?? ""} onChange={(event) => setDraft({ ...draft, stage_id: event.target.value || null })}><option value="">不关联</option>{detail.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select></label>
      </div>
      <label>标题<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>检验内容<textarea value={draft.content ?? ""} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
      <label>结果<textarea value={draft.result ?? ""} onChange={(event) => setDraft({ ...draft, result: event.target.value })} /></label>
      <div className="field-grid">
        <label>分数<input type="number" value={draft.score ?? ""} onChange={(event) => setDraft({ ...draft, score: toNumberOrNull(event.target.value) })} /></label>
        <label>满分<input type="number" value={draft.score_max ?? ""} onChange={(event) => setDraft({ ...draft, score_max: toNumberOrNull(event.target.value) })} /></label>
      </div>
      <label>暴露的问题<textarea value={draft.exposed_problems ?? ""} onChange={(event) => setDraft({ ...draft, exposed_problems: event.target.value })} /></label>
      <label>反思<textarea value={draft.reflection ?? ""} onChange={(event) => setDraft({ ...draft, reflection: event.target.value })} /></label>
      <label>建议调整<textarea value={draft.proposed_adjustment ?? ""} onChange={(event) => setDraft({ ...draft, proposed_adjustment: event.target.value })} /></label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function FormActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="action-row">
      <button type="submit">保存</button>
      <button className="ghost-button" type="button" onClick={onCancel}>取消</button>
    </div>
  );
}

function createProjectDraft(detail: LearningProjectDetail): LearningProjectInput {
  return {
    id: detail.project.id,
    domain_id: detail.project.domain_id,
    title: detail.project.title,
    status: detail.project.status,
    goal: detail.project.goal,
    current_level: detail.project.current_level,
    target_state: detail.project.target_state,
    motivation: detail.project.motivation,
    start_date: detail.project.start_date,
    target_date: detail.project.target_date,
    weekly_time_budget_min: detail.project.weekly_time_budget_min,
    constraints: detail.project.constraints,
    preferred_methods: detail.project.preferred_methods,
  };
}

function createStageDraft(projectId: string, stage?: LearningPathStageSummary): LearningStageInput {
  return {
    id: stage?.id,
    project_id: projectId,
    title: stage?.title ?? "",
    stage_goal: stage?.stage_goal ?? null,
    completion_criteria: stage?.completion_criteria ?? null,
    status: stage?.status ?? "pending",
  };
}

function createResourceDraft(projectId: string, resource?: LearningProjectDetail["resources"][number]): LearningResourceInput {
  return {
    id: resource?.id,
    project_id: projectId,
    name: resource?.name ?? "",
    resource_type: resource?.resource_type ?? "book",
    purpose: resource?.purpose ?? null,
    url: resource?.url ?? null,
    status: resource?.status ?? "evaluating",
    evaluation: resource?.evaluation ?? null,
    note: resource?.note ?? null,
  };
}

function createRoutineDraft(projectId: string, routine?: LearningProjectDetail["routines"][number]): LearningRoutineInput {
  return {
    id: routine?.id,
    project_id: projectId,
    title: routine?.title ?? "",
    frequency_type: routine?.frequency_type ?? "daily",
    target_count_per_week: routine?.target_count_per_week ?? null,
    standard_action: routine?.standard_action ?? null,
    minimum_action: routine?.minimum_action ?? null,
    estimated_minutes: routine?.estimated_minutes ?? null,
    is_active: routine?.is_active ?? true,
  };
}

function createRecordDraft(projectId: string, record?: LearningProjectDetail["records"][number]): LearningRecordInput {
  return {
    id: record?.id,
    project_id: projectId,
    stage_id: record?.stage_id ?? null,
    routine_id: record?.routine_id ?? null,
    occurred_on: record?.occurred_on ?? formatLocalDate(new Date()),
    occurred_time: record ? formatTimeFromIso(record.occurred_at) : formatLocalTime(new Date()),
    duration_min: record?.duration_min ?? null,
    quantity_value: record?.quantity_value ?? null,
    quantity_unit: record?.quantity_unit ?? null,
    completion_level: record?.completion_level ?? "standard",
    content: record?.content ?? null,
    output: record?.output ?? null,
    difficulty_tags: record?.difficulty_tags ?? [],
    feedback: record?.feedback ?? null,
    next_step: record?.next_step ?? null,
  };
}

function createAssessmentDraft(projectId: string, assessment?: LearningProjectDetail["assessments"][number]): LearningAssessmentInput {
  return {
    id: assessment?.id,
    project_id: projectId,
    stage_id: assessment?.stage_id ?? null,
    occurred_on: assessment?.occurred_on ?? formatLocalDate(new Date()),
    assessment_type: assessment?.assessment_type ?? "test",
    title: assessment?.title ?? "",
    content: assessment?.content ?? null,
    result: assessment?.result ?? null,
    score: assessment?.score ?? null,
    score_max: assessment?.score_max ?? null,
    exposed_problems: assessment?.exposed_problems ?? null,
    reflection: assessment?.reflection ?? null,
    proposed_adjustment: assessment?.proposed_adjustment ?? null,
  };
}

function getProjectIdFromHash(): string | null {
  const query = window.location.hash.split("?")[1] ?? "";
  return new URLSearchParams(query).get("id");
}

function formatStageStatus(status: LearningStageStatus): string {
  return STAGE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function formatResourceType(type: LearningResourceType): string {
  return RESOURCE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function formatResourceStatus(status: LearningResourceStatus): string {
  return RESOURCE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function formatRoutineFrequency(value: LearningRoutineFrequency): string {
  return ROUTINE_FREQUENCY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function toNumberOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function splitTags(value: string): string[] {
  return value.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
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

function formatTimeFromIso(value: string): string {
  return formatLocalTime(new Date(value));
}
