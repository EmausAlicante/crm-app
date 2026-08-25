"use client";

import { useState, type ReactNode } from "react";

export default function CompanyTabs({
  tabs,
  defaultTab,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
  defaultTab?: string;
}) {
  const initial = defaultTab && tabs.some((t) => t.key === defaultTab) ? defaultTab : tabs[0]?.key;
  const [active, setActive] = useState(initial);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`text-sm px-3 py-2 -mb-px border-b-2 ${
              active === t.key
                ? "border-blue-600 text-blue-600 font-medium"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div key={t.key} className={active === t.key ? "flex flex-col gap-5" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
