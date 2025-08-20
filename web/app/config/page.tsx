"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";

import { API_BASE } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MultiSelect } from "@/components/multi-select";

import {
  PLATFORM_OPTIONS, DATE_RANGE_OPTIONS, CADENCE_OPTIONS, DELIVERY_OPTIONS,
  META_METRICS, META_LEVELS, TIKTOK_METRICS, TIKTOK_LEVELS
} from "@/lib/options";
import type { Platform, ReportConfig } from "@/types/report";

const schema = z.object({
  platform: z.enum(["meta","tiktok"]),
  metrics: z.array(z.string()).min(1, "Select at least one metric"),
  level: z.string().min(1, "Level is required"),
  dateRangeEnum: z.enum(["last7","last14","last30"]),
  cadence: z.enum(["manual","hourly","every12h","daily"]),
  delivery: z.enum(["email","link"]),
  email: z.string().optional()
}).refine(v => v.delivery === "email" ? !!v.email && /\S+@\S+\.\S+/.test(v.email) : true, {
  message: "Valid email required when delivery is email",
  path: ["email"]
});

type FormValues = z.infer<typeof schema>;

export default function ConfigurePage() {
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState<ReportConfig | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/config`)
      .then(r => setPrefill(r.data?.config ?? null))
      .catch(() => {});
  }, []);

  const defaults: FormValues = prefill
    ? {
        platform: prefill.platform,
        metrics: prefill.metrics,
        level: prefill.level,
        dateRangeEnum: prefill.dateRangeEnum,
        cadence: prefill.cadence,
        delivery: prefill.delivery,
        email: prefill.email ?? ""
      }
    : {
        platform: "meta",
        metrics: [],
        level: "",
        dateRangeEnum: "last7",
        cadence: "manual",
        delivery: "link",
        email: ""
      };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults
  });

  useEffect(() => {
    if (prefill) {
      form.reset({
        platform: prefill.platform,
        metrics: prefill.metrics,
        level: prefill.level,
        dateRangeEnum: prefill.dateRangeEnum,
        cadence: prefill.cadence,
        delivery: prefill.delivery,
        email: prefill.email ?? ""
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const platform = form.watch("platform") as Platform;

  const metricOptions = useMemo(
    () => (platform === "meta" ? META_METRICS : TIKTOK_METRICS)
          .map((m: string) => ({ label: m, value: m })),
    [platform]
  );

  const levelOptions = useMemo(
    () => (platform === "meta" ? META_LEVELS : TIKTOK_LEVELS)
          .map((l: string) => ({ label: l, value: l })),
    [platform]
  );

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/config`, {
        ...values,
        // server expects undefined/nullless when not email
        email: values.delivery === "email" ? values.email : undefined
      });
      toast.success("Saved and ready to schedule");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error?.message ??
        e?.response?.data?.error ??
        "Failed to save";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configure Report</h1>
        <Link className="text-sm underline" href="/dashboard">Go to Dashboard</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Platform</Label>
              <Select value={form.watch("platform")} onValueChange={(v: "meta" | "tiktok") => form.setValue("platform", v)}>
                <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={form.watch("dateRangeEnum")} onValueChange={(v: "last7" | "last14" | "last30") => form.setValue("dateRangeEnum", v)}>
                <SelectTrigger><SelectValue placeholder="Pick range" /></SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Metrics</Label>
            <MultiSelect
              options={metricOptions}
              value={form.watch("metrics")}
              onChange={(v: string[]) => form.setValue("metrics", v, { shouldValidate: true })}
              placeholder="Select one or more metrics"
            />
            {form.formState.errors.metrics && (
              <p className="text-sm text-red-600">{form.formState.errors.metrics.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={form.watch("level")} onValueChange={(v: string) => form.setValue("level", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {levelOptions.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.formState.errors.level && (
              <p className="text-sm text-red-600">{form.formState.errors.level.message as string}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cadence</Label>
              <Select value={form.watch("cadence")} onValueChange={(v: "manual" | "hourly" | "every12h" | "daily") => form.setValue("cadence", v)}>
                <SelectTrigger><SelectValue placeholder="Select cadence" /></SelectTrigger>
                <SelectContent>
                  {CADENCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Delivery</Label>
              <Select value={form.watch("delivery")} onValueChange={(v: "email" | "link") => form.setValue("delivery", v)}>
                <SelectTrigger><SelectValue placeholder="Select delivery" /></SelectTrigger>
                <SelectContent>
                  {DELIVERY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.watch("delivery") === "email" && (
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="you@example.com"
                value={form.watch("email") ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  form.setValue("email", e.target.value, { shouldValidate: true })
                }
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message as string}</p>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button disabled={loading} onClick={form.handleSubmit(onSubmit)}>
              {loading ? "Saving..." : "Save & Start"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
