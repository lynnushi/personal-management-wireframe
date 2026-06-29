import { PageSection } from "../components/PageSection";
import { PlaceholderCard } from "../components/PlaceholderCard";
import { PageProps } from "./pageTypes";

export function RecordDetailPage({ navigate }: PageProps) {
  return (
    <>
      <PageSection title="记录内容">
        <PlaceholderCard title="通用记录详情占位" body="身体、学习和兴趣单条记录会共用这个详情页承载查看、编辑和删除入口。" />
      </PageSection>
      <PageSection title="维护操作">
        <div className="action-row">
          <button type="button">编辑占位</button>
          <button type="button">删除占位</button>
          <button type="button" onClick={() => navigate("/settings")}>查看回收站占位</button>
        </div>
      </PageSection>
    </>
  );
}
