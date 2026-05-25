import { getBrowserSupabase } from "@/lib/supabase/client";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("图片读取失败"));
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function getMistakeImageBucketName(): string | null {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_MISTAKE_IMAGE_BUCKET?.trim();
  return bucket || null;
}

function buildStorageObjectPath(userId: string, file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(extension)
    ? extension
    : "jpg";
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `${userId}/${Date.now()}-${randomSuffix}.${safeExtension}`;
}

/**
 * 若配置了 Supabase Storage 桶且用户已登录，则上传并返回公开 URL；
 * 否则返回 data URL（供 Vision API 直接使用）。
 */
export async function uploadMistakeQuestionImage(
  file: File,
  options?: { userId?: string | null }
): Promise<string> {
  const bucket = getMistakeImageBucketName();
  const userId = options?.userId?.trim();
  const supabase = getBrowserSupabase();

  if (bucket && userId && supabase) {
    const objectPath = buildStorageObjectPath(userId, file);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      if (data.publicUrl) return data.publicUrl;
    }

    console.warn("[mistake-image] Supabase 上传失败，改用本地 Base64：", uploadError?.message);
  }

  return readFileAsDataUrl(file);
}
