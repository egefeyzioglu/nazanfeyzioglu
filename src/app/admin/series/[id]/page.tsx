import { notFound } from "next/navigation";

import SeriesEditor from "./SeriesEditor";

export default async function AdminSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();
  return <SeriesEditor id={numericId} />;
}
