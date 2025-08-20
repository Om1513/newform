"use client";

import useSWR from "swr";
import axios from "axios";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { API_BASE } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => axios.get(url).then(r => r.data);

export default function DashboardPage() {
  const { data, isLoading, mutate } = useSWR(`${API_BASE}/api/status`, fetcher, { refreshInterval: 5000 });
  const [running, setRunning] = useState(false);

  const status = data?.status ?? {};
  const config = data?.config ?? null;

  async function runNow() {
    try {
      setRunning(true);
      await axios.post(`${API_BASE}/api/run-now`);
      toast.success("Run triggered");
      mutate();
    } catch (e: any) {
      toast.error(String(e?.response?.data?.error ?? "Failed to run"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link className="text-sm underline" href="/config">Edit Configuration</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-neutral-600">Loading…</p>
          ) : !config ? (
            <p className="text-neutral-600">No configuration saved yet. <Link className="underline" href="/config">Create one</Link>.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><span className="text-neutral-500">Platform:</span> {config.platform}</div>
                <div><span className="text-neutral-500">Cadence:</span> {config.cadence}</div>
                <div><span className="text-neutral-500">Delivery:</span> {config.delivery}{config.delivery === "email" && ` (${config.email})`}</div>
                <div><span className="text-neutral-500">Metrics:</span> {config.metrics.join(", ")}</div>
                <div><span className="text-neutral-500">Level:</span> {config.level}</div>
                <div><span className="text-neutral-500">Date Range:</span> {config.dateRangeEnum}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 text-sm">
                <div><span className="text-neutral-500">Last Run:</span> {status.lastRunAt ?? "—"}</div>
                <div><span className="text-neutral-500">Next Run:</span> {status.nextRunAt ?? "—"}</div>
                <div><span className="text-neutral-500">Last Error:</span> {status.lastError ?? "—"}</div>
              </div>

              {status.latestPublicUrl && (
                <div className="pt-1">
                  <a className="text-sm underline" href={status.latestPublicUrl} target="_blank" rel="noreferrer">
                    Open Latest Report
                  </a>
                </div>
              )}

              <div className="pt-3">
                <Button onClick={runNow} disabled={running}> {running ? "Running…" : "Run Now"} </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
