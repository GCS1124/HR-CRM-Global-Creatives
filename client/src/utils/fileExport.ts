function escapeCsvValue(value: string | number): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function downloadFile(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  const content = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  downloadFile(filename, content, "text/csv;charset=utf-8;");
}

export function downloadJson(filename: string, data: unknown): void {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8;");
}

export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is not available in this browser.");
  }

  await navigator.clipboard.writeText(text);
}
