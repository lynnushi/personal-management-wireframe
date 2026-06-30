import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AppMetadata, DataAccessPort, ProfileSummary } from "../app/ports";
import { PageSection } from "../components/PageSection";
import { createBackupFilename, downloadBlob } from "../utils/download";
import { PageProps } from "./pageTypes";

interface SettingsPageProps extends PageProps {
  dataAccess: DataAccessPort;
}

export function SettingsPage({ dataAccess }: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState<AppMetadata | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [heightInput, setHeightInput] = useState("");
  const [status, setStatus] = useState("本地数据库准备中。");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void refreshMetadata();
  }, []);

  const refreshMetadata = async () => {
    const [nextMetadata, nextProfile] = await Promise.all([
      dataAccess.getMetadata(),
      dataAccess.getProfile(),
    ]);
    setMetadata(nextMetadata);
    setProfile(nextProfile);
    setHeightInput(nextProfile.height_cm === null ? "" : String(nextProfile.height_cm));
    setStatus("本地数据库已初始化。");
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    try {
      const trimmed = heightInput.trim();
      const height_cm = trimmed === "" ? null : Number(trimmed);
      await dataAccess.updateProfile({ height_cm });
      await refreshMetadata();
      setStatus("个人资料已保存。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存个人资料失败。");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExport = async () => {
    setIsBusy(true);
    setStatus("正在导出 JSON 备份。");
    try {
      const blob = await dataAccess.exportJsonBackup();
      downloadBlob(blob, createBackupFilename());
      await refreshMetadata();
      setStatus("JSON 备份已生成。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "导出失败。");
    } finally {
      setIsBusy(false);
    }
  };

  const handleChooseImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const shouldContinue = window.confirm(
      "覆盖导入会替换当前本地数据。请先导出当前数据备份；确认已经备份后再继续。",
    );

    if (!shouldContinue) {
      setStatus("已取消覆盖导入。");
      return;
    }

    setIsBusy(true);
    setStatus("正在校验备份文件。");
    try {
      await dataAccess.importJsonBackup(file);
      await refreshMetadata();
      setStatus("覆盖导入完成。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "导入失败，当前数据未被替换。");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <PageSection title="基础设置">
        <form className="form-stack" onSubmit={handleSaveProfile}>
          <article className="placeholder-card">
            <div>
              <h3>个人资料</h3>
              <p>当前身高：{profile?.height_cm ? `${profile.height_cm} cm` : "未设置"}</p>
              <p>BMI 根据当前身高和体重自动计算，仅供个人趋势参考。</p>
            </div>
          </article>
          <label>
            身高 cm
            <input
              inputMode="decimal"
              min="50"
              name="height_cm"
              placeholder="例如 165"
              step="0.1"
              type="number"
              value={heightInput}
              onChange={(event) => setHeightInput(event.target.value)}
            />
          </label>
          <div className="action-row">
            <button disabled={isBusy} type="submit">
              保存个人资料
            </button>
          </div>
        </form>
      </PageSection>
      <PageSection title="数据管理">
        <div className="stack">
          <article className="placeholder-card">
            <div>
              <h3>本地备份</h3>
              <p>最近备份：{formatDateTime(metadata?.last_backup_at)}</p>
              <p>数据库版本：{metadata?.schema_version ?? "读取中"}</p>
              <p>预设兴趣分类：{metadata?.interest_category_count ?? 0} 个</p>
            </div>
            <div className="button-stack">
              <button disabled={isBusy} type="button" onClick={handleExport}>
                导出当前 JSON
              </button>
              <button disabled={isBusy} type="button" onClick={handleChooseImportFile}>
                覆盖导入 JSON
              </button>
              <input
                accept="application/json,.json"
                className="visually-hidden"
                ref={fileInputRef}
                type="file"
                onChange={handleImportFile}
              />
            </div>
          </article>
          <article className="notice-panel">
            <h3>本地存储风险提示</h3>
            <p>
              当前数据只保存在这台设备的浏览器中。清除浏览器数据、换设备、卸载浏览器或系统存储清理，都可能造成未备份数据丢失。
            </p>
            <p>覆盖导入前请先导出当前 JSON；第二阶段暂不包含图片和 ZIP 备份。</p>
          </article>
          <p className="status-text">{status}</p>
        </div>
      </PageSection>
    </>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "尚未备份";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
