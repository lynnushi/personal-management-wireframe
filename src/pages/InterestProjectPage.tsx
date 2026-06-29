import { PageSection } from "../components/PageSection";
import { PlaceholderCard } from "../components/PlaceholderCard";
import { PageProps } from "./pageTypes";

export function InterestProjectPage({ navigate }: PageProps) {
  return (
    <>
      <PageSection title="项目信息">
        <PlaceholderCard title="兴趣项目详情占位" body="封面、分类、状态、简介和总体进度会在兴趣阶段接入。" />
      </PageSection>
      <PageSection title="时间线">
        <PlaceholderCard
          title="进展记录占位"
          body="后续按实际发生日期展示文字、照片、问题、感想和下一步。"
          actionLabel="进入通用记录详情"
          to="/record"
          navigate={navigate}
        />
      </PageSection>
    </>
  );
}
