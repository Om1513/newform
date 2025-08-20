import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Scheduled Insight Reports</h1>
      <p className="text-neutral-600">Configure one recurring insight report, then monitor and trigger runs from the dashboard.</p>
      <div className="flex gap-3 pt-2">
        <Link className="underline" href="/config">Configure Report</Link>
        <Link className="underline" href="/dashboard">Dashboard</Link>
      </div>
    </main>
  );
}
