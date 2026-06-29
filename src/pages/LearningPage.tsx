import { PageSection } from "../components/PageSection";
import { PlaceholderCard } from "../components/PlaceholderCard";
import { PageProps } from "./pageTypes";

export function LearningPage({ navigate }: PageProps) {
  return (
    <>
      <PageSection title="学习统计">
        <div className="metric-row">
          <div><strong>0 天</strong><span>学习天数</span></div>
          <div><strong>0 分钟</strong><span>累计时长</span></div>
          <div><strong>0</strong><span>完成数量</span></div>
        </div>
      </PageSection>

      <PageSection title="当前学习项目">
        <PlaceholderCard
          title="学习项目列表占位"
          body="后续会展示进行中的项目、项目状态和最近学习日期。"
          actionLabel="进入学习项目详情"
          to="/learning/project"
          navigate={navigate}
        />
      </PageSection>

      <PageSection title="最近学习记录">
        <PlaceholderCard
          title="最近记录占位"
          body="学习记录接入后会显示内容、进度、下一步计划。"
          actionLabel="进入通用记录详情"
          to="/record"
          navigate={navigate}
        />
      </PageSection>
    </>
  );
}
