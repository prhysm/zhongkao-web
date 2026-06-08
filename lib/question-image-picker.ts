"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, type MediaResult } from "@capacitor/camera";

export type QuestionImagePickSource = "camera" | "gallery";

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

async function mediaResultToFile(result: MediaResult): Promise<File> {
  const format = result.metadata?.format ?? "jpeg";
  const extension = format === "png" ? "png" : "jpg";
  const filename = `question-${Date.now()}.${extension}`;

  if (result.webPath) {
    const response = await fetch(result.webPath);
    const blob = await response.blob();
    const mime = blob.type || (extension === "png" ? "image/png" : "image/jpeg");
    return new File([blob], filename, { type: mime });
  }

  if (result.thumbnail) {
    const mime = extension === "png" ? "image/png" : "image/jpeg";
    return dataUrlToFile(`data:${mime};base64,${result.thumbnail}`, filename);
  }

  throw new Error("未获取到图片数据");
}

async function ensurePickerPermissions(source: QuestionImagePickSource) {
  const permissions = await Camera.checkPermissions();
  if (source === "camera") {
    if (permissions.camera === "granted") return;
    const result = await Camera.requestPermissions({ permissions: ["camera"] });
    if (result.camera !== "granted") {
      throw new Error("需要相机权限才能拍照，请在系统设置中允许访问相机");
    }
    return;
  }

  if (permissions.photos === "granted" || permissions.photos === "limited") return;
  const result = await Camera.requestPermissions({ permissions: ["photos"] });
  if (result.photos !== "granted" && result.photos !== "limited") {
    throw new Error("需要相册权限才能选择图片，请在系统设置中允许访问相册");
  }
}

export function isPickerCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return /cancel|cancelled|no image|user denied|dismiss/i.test(`${code} ${message}`);
}

async function pickWithCapacitorCamera(source: QuestionImagePickSource): Promise<File> {
  await ensurePickerPermissions(source);

  if (source === "camera") {
    const result = await Camera.takePhoto({
      quality: 90,
      includeMetadata: true,
      correctOrientation: true,
      editable: "no",
    });
    return mediaResultToFile(result);
  }

  const { results } = await Camera.chooseFromGallery({
    allowMultipleSelection: false,
    quality: 90,
    includeMetadata: true,
    editable: "no",
  });

  const first = results[0];
  if (!first) {
    throw new Error("未选择图片");
  }

  return mediaResultToFile(first);
}

/** 在 Capacitor 原生环境中通过系统相机或相册选取题目图片。 */
export async function pickQuestionImageNative(source: QuestionImagePickSource): Promise<File> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("pickQuestionImageNative 仅用于原生环境");
  }
  return pickWithCapacitorCamera(source);
}

export function isNativeQuestionImagePicker(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/** 客户端挂载后可靠判断是否为 Capacitor 原生环境（避免 SSR / 首屏误判）。 */
export function useNativeQuestionImagePicker(): boolean {
  const [isNative, setIsNative] = useState(() => isNativeQuestionImagePicker());

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  return isNative;
}
