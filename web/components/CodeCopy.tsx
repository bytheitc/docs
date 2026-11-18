"use client";
import { useEffect } from "react";

/** Adds a Copy button to every code block on the page. */
export function CodeCopy() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLDivElement>(".prose .code");
    const added: HTMLButtonElement[] = [];
    blocks.forEach((block) => {
      if (block.querySelector(".copy")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy";
      btn.textContent = "Copy";
      btn.addEventListener("click", async () => {
        const text = block.querySelector("code")?.innerText ?? "";
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copied";
        } catch {
          btn.textContent = "Select and copy";
        }
        setTimeout(() => (btn.textContent = "Copy"), 1600);
      });
      block.appendChild(btn);
      added.push(btn);
    });
    return () => added.forEach((b) => b.remove());
  });
  return null;
}
