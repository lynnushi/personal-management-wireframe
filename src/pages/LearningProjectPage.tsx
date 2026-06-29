import { PageSection } from "../components/PageSection";
import { PlaceholderCard } from "../components/PlaceholderCard";
import { PageProps } from "./pageTypes";

export function LearningProjectPage({ navigate }: PageProps) {
  return (
    <>
      <PageSection title="项目信息">
        <PlaceholderCard title="学习项目详情占位" body="项目名称、分类、状态、目标和说明会在学习阶段接入。" />
      </PageSection>
      <PageSection title="项目记录">
        <PlaceholderCard
          title="项目记录列表占位"
          body="单次学习记录会按日期排列，并可进入通用记录详情。"
          actionLabel="进入通用记录详情"
          to="/record"
          navigate={navigate}
        />
      </PageSection>
    </>
  );
}
