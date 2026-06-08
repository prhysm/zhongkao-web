import { Capacitor } from "@capacitor/core";

/** Capacitor 原生或触屏设备，浏览器下载 / window.print 往往不可用。 */
export function needsMobileExportFlow(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export async function shareOrDownloadBlob(
  blob: Blob,
  filename: string,
  shareTitle?: string
): Promise<void> {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: shareTitle ?? filename,
    });
    return;
  }

  const url = URL.createObjectURL(blob);

  if (needsMobileExportFlow()) {
    const opened = window.open(url, "_blank");
    if (!opened) {
      window.location.assign(url);
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
