export function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!isValidWeight(weightKg) || !isValidHeight(heightCm)) return null;
  return weightKg / Math.pow(heightCm / 100, 2);
}

export function formatBmi(value: number | null): string | null {
  return value === null ? null : value.toFixed(1);
}

export function isValidHeight(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidWeight(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
