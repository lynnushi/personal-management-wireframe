export type BodyWeatherLevel = 1 | 2 | 3 | 4 | 5;

export interface BodyWeatherOption {
  level: BodyWeatherLevel;
  icon: string;
  name: string;
  description: string;
}

export const BODY_WEATHER_LEVELS: BodyWeatherOption[] = [
  { level: 5, icon: "☀️", name: "晴朗", description: "精力充足，身体轻松" },
  { level: 4, icon: "🌤️", name: "多云", description: "整体正常，有轻微疲劳或不适" },
  { level: 3, icon: "☁️", name: "阴天", description: "状态一般，疲劳或不适比较明显" },
  { level: 2, icon: "🌧️", name: "下雨", description: "状态较差，已经影响日常安排" },
  { level: 1, icon: "⛈️", name: "暴雨", description: "明显不舒服，需要休息或持续关注" },
];

export const BODY_WEATHER_IMPACT_TAGS = [
  "睡眠不足",
  "睡眠良好",
  "精力低",
  "疲劳",
  "肌肉酸痛",
  "头痛",
  "肠胃不适",
  "浮肿",
  "经期不适",
  "感冒",
  "身体轻盈",
  "恢复良好",
];

export function getBodyWeatherOption(level: BodyWeatherLevel | null): BodyWeatherOption | null {
  if (level === null) return null;
  return BODY_WEATHER_LEVELS.find((option) => option.level === level) ?? null;
}

export function isBodyWeatherLevel(value: unknown): value is BodyWeatherLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}
