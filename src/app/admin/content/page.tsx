"use client";

import { useEffect, useState } from "react";

import { Button, inputCls, labelCls } from "src/app/admin/_components/ui";
import { api } from "src/trpc/react";

export default function AdminContentPage() {
  const utils = api.useUtils();
  const list = api.content.list.useQuery();
  const save = api.content.save.useMutation({
    onSuccess: () => utils.content.list.invalidate(),
  });

  const [values, setValues] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (list.data && !values) {
      setValues(Object.fromEntries(list.data.map((f) => [f.key, f.value])));
    }
  }, [list.data, values]);

  if (list.isLoading || !values) {
    return <p className="font-mono text-[11px] text-ash">Loading…</p>;
  }

  const fields = list.data ?? [];
  const groups = [...new Set(fields.map((f) => f.group))];
  const dirty = fields.some((f) => values[f.key] !== f.value);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-light">Page copy</h1>
        <div className="flex items-center gap-3">
          {save.isSuccess && !dirty && (
            <span className="font-mono text-[10px] text-ash">Saved.</span>
          )}
          <Button
            disabled={save.isPending || !dirty}
            onClick={() =>
              save.mutate({
                entries: fields.map((f) => ({
                  key: f.key,
                  value: values[f.key] ?? f.value,
                })),
              })
            }
          >
            {save.isPending ? "Saving…" : "Save all"}
          </Button>
        </div>
      </div>
      {save.error && (
        <p className="mt-3 font-mono text-[11px] text-red-700">
          {save.error.message}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group}>
            <div className="border-b border-line pb-2 font-mono text-[11px] tracking-[0.26em] text-clay uppercase">
              {group}
            </div>
            <div className="mt-4 flex flex-col gap-5">
              {fields
                .filter((f) => f.group === group)
                .map((f) => (
                  <label key={f.key} className="block">
                    <span className={labelCls}>{f.label}</span>
                    {f.multiline ? (
                      <textarea
                        className={`${inputCls} min-h-[120px] leading-[1.7]`}
                        value={values[f.key] ?? ""}
                        onChange={(e) =>
                          setValues({ ...values, [f.key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        className={inputCls}
                        value={values[f.key] ?? ""}
                        onChange={(e) =>
                          setValues({ ...values, [f.key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
