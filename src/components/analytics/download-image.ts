"use client";

import { toPng } from "html-to-image";

export async function downloadPng(
  target: HTMLElement,
  filename: string
): Promise<void> {
  const dataUrl = await toPng(target, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#0f172a",
  });

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
