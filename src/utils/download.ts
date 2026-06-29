export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createBackupFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `personal-manager-backup-${stamp}.json`;
}
