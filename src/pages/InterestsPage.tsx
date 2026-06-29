import { PageSection } from "../components/PageSection";
import { PlaceholderCard } from "../components/PlaceholderCard";
import { PageProps } from "./pageTypes";

export function InterestsPage({ navigate }: PageProps) {
  return (
    <>
      <PageSection title="兴趣分类">
        <div className="chip-row">
          <button type="button" aria-pressed="true">全部</button>
          <button type="button">手工</button>
          <button type="button">游戏</button>
          <button type="button">书影音</button>
          <button type="button">更多</button>
        </div>
      </PageSection>

      <PageSection title="兴趣项目">
        <PlaceholderCard
          title="兴趣项目列表占位"
          body="后续会展示项目状态、最近活动、照片数量和归档入口。"
          actionLabel="进入兴趣项目时间线"
          to="/interests/project"
          navigate={navigate}
        />
      </PageSection>

      <PageSection title="最近进展与照片">
        <div className="stack">
          <PlaceholderCard title="最近进展占位" body="照片上传和 ZIP 完整备份会在同一阶段共同验收。" />
          <PlaceholderCard title="待打印照片占位" body="待打印标记会设置在单张照片上，不单独拆页面。" />
        </div>
      </PageSection>
    </>
  );
}
