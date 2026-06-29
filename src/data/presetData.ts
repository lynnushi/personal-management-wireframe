import { InterestCategoryRecord } from "./models";

const PRESET_CATEGORY_NAMES = ["书影音", "游戏", "手工", "运动", "旅行", "摄影", "美食", "其他"];

export function createPresetInterestCategories(now: string): InterestCategoryRecord[] {
  return PRESET_CATEGORY_NAMES.map((name, index) => ({
    id: `preset-interest-category-${index + 1}`,
    name,
    is_preset: true,
    sort_order: index + 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }));
}
