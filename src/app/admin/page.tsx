"use client";

import { cardCls, PageHeader } from "src/app/admin/_components/ui";
import type {
  AnalyticsOverview,
  DailyViews,
  FunnelStep,
} from "src/lib/posthog-analytics";
import { api } from "src/trpc/react";

const numberFormat = new Intl.NumberFormat("en-CA");

function formatCount(value: number): string {
  return numberFormat.format(value);
}

/** `2026-09-24` → `Sep 24`, without a timezone shift. */
function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Admin landing page: site views and the checkout funnel from PostHog. */
export default function AdminOverviewPage() {
  const query = api.analytics.overview.useQuery(undefined, {
    // The server caches PostHog answers for five minutes; there is nothing
    // new to see before then.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Site activity"
        description="Public-site views and the checkout funnel for the last 30 days, from PostHog. Visits from the admin panel and from admin accounts are left out. Numbers refresh every few minutes."
      />

      {query.isPending && (
        <p className="text-stone font-mono text-[11px]">Loading analytics…</p>
      )}

      {query.error && (
        <Notice title="Analytics unavailable">{query.error.message}</Notice>
      )}

      {query.data && !query.data.configured && (
        <SetupNotice missing={query.data.missing} />
      )}

      {query.data?.configured && <Overview data={query.data.overview} />}
    </div>
  );
}

function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <Notice title="Analytics not configured yet">
      Set{" "}
      {missing.map((name, i) => (
        <span key={name}>
          {i > 0 && (i === missing.length - 1 ? " and " : ", ")}
          <code className="text-ink">{name}</code>
        </span>
      ))}{" "}
      in the environment (see .env.example and the README) and redeploy. The
      personal API key is created in PostHog under Settings → Personal API keys
      with the <code className="text-ink">query:read</code> scope.
    </Notice>
  );
}

function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${cardCls} max-w-[640px] p-6`}>
      <h2 className="font-spectral text-[20px] italic">{title}</h2>
      <p className="text-stone mt-3 font-mono text-[11px] leading-[1.9]">
        {children}
      </p>
    </div>
  );
}

function Overview({ data }: { data: AnalyticsOverview }) {
  const fetchedAt = new Date(data.fetchedAt);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Page views" value={data.views} />
        <StatTile label="Unique visitors" value={data.visitors} />
        <StatTile
          label="Checkouts started"
          value={data.funnel[0]?.people ?? 0}
        />
        <StatTile
          label="Payments completed"
          value={data.funnel[2]?.people ?? 0}
        />
      </div>

      <section className={`${cardCls} p-6`}>
        <SectionTitle
          title="Daily page views"
          hint={`${data.windowDays} days · hover a bar for the day`}
        />
        <DailyBars daily={data.daily} />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className={`${cardCls} p-6`}>
          <SectionTitle
            title="Checkout funnel"
            hint="people reaching each step"
          />
          <Funnel steps={data.funnel} />
          <p className="text-ash mt-4 font-mono text-[10.5px] leading-[1.8]">
            The first step is recorded in the browser and the rest by the
            server, so with visitors who block analytics a later step can exceed
            an earlier one. Refunds are counted per order.
          </p>
        </section>

        <section className={`${cardCls} p-6`}>
          <SectionTitle title="Most viewed pages" hint="by page views" />
          {data.topPages.length === 0 ? (
            <p className="text-stone font-mono text-[11px]">
              No page views recorded yet.
            </p>
          ) : (
            <table className="w-full font-mono text-[11px]">
              <thead className="sr-only">
                <tr>
                  <th>Page</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((page) => (
                  <tr key={page.path} className="border-line-soft border-t">
                    <td className="text-ink max-w-0 truncate py-2 pr-4">
                      {page.path}
                    </td>
                    <td className="text-stone py-2 text-right tabular-nums">
                      {formatCount(page.views)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <p className="text-ash font-mono text-[10.5px]">
        Updated{" "}
        {fetchedAt.toLocaleString("en-CA", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
        . PostHog ingests events with a short delay, so the newest minutes may
        be missing.
      </p>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="font-spectral text-[20px] italic">{title}</h2>
      {hint && (
        <span className="text-ash font-mono text-[10.5px] tracking-[0.06em]">
          {hint}
        </span>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${cardCls} p-5`}>
      <div className="text-stone font-mono text-[10px] tracking-[0.18em] uppercase">
        {label}
      </div>
      <div className="text-ink mt-2 text-[28px] leading-none font-semibold tabular-nums">
        {formatCount(value)}
      </div>
    </div>
  );
}

/** One bar per day, single hue; the exact figures are in the table below. */
function DailyBars({ daily }: { daily: DailyViews[] }) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  const first = daily[0];
  const last = daily[daily.length - 1];
  return (
    <div>
      <ol
        className="flex h-[120px] items-end gap-[2px]"
        aria-label="Daily page views"
      >
        {daily.map((d) => (
          <li
            key={d.day}
            className="group relative flex h-full flex-1 items-end"
            title={`${formatDay(d.day)}: ${formatCount(d.views)} views, ${formatCount(d.visitors)} visitors`}
          >
            <span className="sr-only">
              {formatDay(d.day)}: {formatCount(d.views)} views,{" "}
              {formatCount(d.visitors)} visitors
            </span>
            <div
              aria-hidden="true"
              className="bg-clay group-hover:bg-ink w-full rounded-t-[4px] transition-colors"
              style={{
                height: `${Math.max(d.views > 0 ? 3 : 1, (d.views / max) * 100)}%`,
                opacity: d.views > 0 ? 1 : 0.3,
              }}
            />
          </li>
        ))}
      </ol>
      <div className="text-ash mt-2 flex justify-between font-mono text-[10px]">
        <span>{first ? formatDay(first.day) : ""}</span>
        <span>{last ? formatDay(last.day) : ""}</span>
      </div>
      <details className="mt-3">
        <summary className="text-stone hover-clay cursor-pointer font-mono text-[10.5px] tracking-[0.1em] uppercase">
          Show as table
        </summary>
        <table className="mt-3 w-full font-mono text-[11px]">
          <thead>
            <tr className="text-stone text-left text-[10px] tracking-[0.12em] uppercase">
              <th className="py-1 font-normal">Day</th>
              <th className="py-1 text-right font-normal">Views</th>
              <th className="py-1 text-right font-normal">Visitors</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.day} className="border-line-soft border-t">
                <td className="py-1">{formatDay(d.day)}</td>
                <td className="py-1 text-right tabular-nums">
                  {formatCount(d.views)}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {formatCount(d.visitors)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Horizontal bars, one per step, scaled to the largest step. */
function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.people));
  return (
    <ol className="flex flex-col gap-3" aria-label="Checkout funnel">
      {steps.map((step) => (
        <li key={step.event}>
          <div className="mb-1 flex items-baseline justify-between gap-4 font-mono text-[11px]">
            <span className="text-ink">{step.label}</span>
            <span className="text-stone tabular-nums">
              {formatCount(step.people)}
              {step.events !== step.people && (
                <span className="text-ash">
                  {" "}
                  · {formatCount(step.events)} events
                </span>
              )}
            </span>
          </div>
          <div
            className="bg-panel h-2 w-full rounded-[4px]"
            role="img"
            aria-label={`${step.label}: ${formatCount(step.people)} people`}
          >
            <div
              className="bg-clay h-full rounded-[4px]"
              style={{
                width: `${Math.max(step.people > 0 ? 1.5 : 0, (step.people / max) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
