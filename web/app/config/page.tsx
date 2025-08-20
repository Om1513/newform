"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Settings } from "lucide-react";

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
  cadence: z.enum(["manual","hourly","every 12 hours","daily"]),
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
    } catch (e: unknown) {
      const error = e as { response?: { data?: { error?: string | { message?: string } } } };
      const errorData = error?.response?.data?.error;
      const msg = typeof errorData === 'object' && errorData?.message 
        ? errorData.message 
        : errorData ?? "Failed to save";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="space-y-1">
              <Link href="/" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-800 transition-colors mb-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                <Settings className="w-8 h-8 text-blue-600" />
                Configure Report
              </h1>
              <p className="text-slate-600">Set up your automated insight report configuration</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-slate-800">Report Settings</CardTitle>
                <p className="text-slate-600">Configure your platform, metrics, and delivery preferences</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <motion.div 
                  variants={itemVariants}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Platform</Label>
                    <Select value={form.watch("platform")} onValueChange={(v: "meta" | "tiktok") => form.setValue("platform", v)}>
                      <SelectTrigger className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value} className="cursor-pointer hover:bg-blue-50">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Date Range</Label>
                    <Select value={form.watch("dateRangeEnum")} onValueChange={(v: "last7" | "last14" | "last30") => form.setValue("dateRangeEnum", v)}>
                      <SelectTrigger className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                        <SelectValue placeholder="Pick range" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_RANGE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="cursor-pointer hover:bg-blue-50">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Metrics</Label>
                  <MultiSelect
                    options={metricOptions}
                    value={form.watch("metrics")}
                    onChange={(v: string[]) => form.setValue("metrics", v, { shouldValidate: true })}
                    placeholder="Select one or more metrics"
                  />
                  {form.formState.errors.metrics && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1"
                    >
                      {form.formState.errors.metrics.message as string}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Level</Label>
                  <Select value={form.watch("level")} onValueChange={(v: string) => form.setValue("level", v, { shouldValidate: true })}>
                    <SelectTrigger className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map((l) => (
                        <SelectItem key={l.value} value={l.value} className="cursor-pointer hover:bg-blue-50">
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.level && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600"
                    >
                      {form.formState.errors.level.message as string}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div 
                  variants={itemVariants}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Cadence</Label>
                    <Select value={form.watch("cadence")} onValueChange={(v: "manual" | "hourly" | "every 12 hours" | "daily") => form.setValue("cadence", v)}>
                      <SelectTrigger className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                        <SelectValue placeholder="Select cadence" />
                      </SelectTrigger>
                      <SelectContent>
                        {CADENCE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="cursor-pointer hover:bg-blue-50">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Delivery</Label>
                    <Select value={form.watch("delivery")} onValueChange={(v: "email" | "link") => form.setValue("delivery", v)}>
                      <SelectTrigger className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20">
                        <SelectValue placeholder="Select delivery" />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="cursor-pointer hover:bg-blue-50">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {form.watch("delivery") === "email" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-semibold text-slate-700">Email Address</Label>
                    <Input
                      placeholder="you@example.com"
                      value={form.watch("email") ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        form.setValue("email", e.target.value, { shouldValidate: true })
                      }
                      className="h-12 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                    {form.formState.errors.email && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600"
                      >
                        {form.formState.errors.email.message as string}
                      </motion.p>
                    )}
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="pt-6">
                  <Button 
                    disabled={loading} 
                    onClick={form.handleSubmit(onSubmit)}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving Configuration...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Save & Start Scheduling
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
