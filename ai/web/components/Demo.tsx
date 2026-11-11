"use client";

import { useEffect, useRef, useState } from "react";

type Who = "user" | "ai";
const SCRIPT: { who: Who; text: string }[] = [
  { who: "user", text: "Is it permissible to combine prayers while travelling for work?" },
  {
    who: "ai",
    text:
      "Many scholars allow combining prayers while travelling, but the conditions (distance, duration, and which prayers) differ between schools of thought.\n\nI can show you the main positions and their sources. For a ruling on your own situation, please ask a scholar you trust. I'm not a substitute for one.",
  },
  { who: "user", text: "Can you remember this conversation for next time?" },
  { who: "ai", text: "Not unless you turn that on. By default nothing leaves your device and nothing is kept. Your questions are an amānah, a trust." },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  // Each entry is the visible text of one message. The last one may still be typing.
  const [shown, setShown] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const play = async () => {
      if (reduce) { setShown(SCRIPT.map((m) => m.text)); return; }
      for (let i = 0; i < SCRIPT.length; i++) {
        const { who, text } = SCRIPT[i];
        setTyping(true);
        for (let c = 1; c <= text.length; c++) {
          if (cancelled) return;
          setShown((prev) => { const next = prev.slice(0, i); next[i] = text.slice(0, c); return next; });
          await sleep(who === "user" ? 28 : 14);
        }
        setTyping(false);
        await sleep(600);
      }
    };

    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { io.disconnect(); play(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, []);

  return (
    <div className="demo" role="img" aria-label="A sample conversation showing an ITC model being honest about its limits and private by default">
      <div className="demo-bar">
        <span className="lights"><i /><i /><i /></span>
        <span className="demo-title">itc-assistant · principles mode</span>
        <span className="demo-badge">sample</span>
      </div>
      <div className="demo-body" ref={ref}>
        {shown.map((txt, i) => {
          const who = SCRIPT[i].who;
          const last = i === shown.length - 1;
          return (
            <div key={i} className={`msg ${who}`}>
              <span className="who">{who === "user" ? "you" : "itc"} ›</span>
              <span className="txt">{txt}{last && typing && <span className="caret" />}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
