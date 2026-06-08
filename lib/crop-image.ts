export type NormalizedCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    image.src = url;
  });
}

/** 按归一化选区（0–1）裁剪图片并输出 JPEG File。 */
export async function cropImageFile(
  file: File,
  crop: NormalizedCropRect,
  quality = 0.92
): Promise<File> {
  const image = await loadImageFromFile(file);
  const sx = Math.round(crop.x * image.naturalWidth);
  const sy = Math.round(crop.y * image.naturalHeight);
  const sw = Math.max(1, Math.round(crop.width * image.naturalWidth));
  const sh = Math.max(1, Math.round(crop.height * image.naturalHeight));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("无法创建画布");
  }

  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("裁剪失败"))),
      "image/jpeg",
      quality
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "question";
  return new File([blob], `${baseName}-cropped.jpg`, { type: "image/jpeg" });
}
