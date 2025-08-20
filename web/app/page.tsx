"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import axios from "axios";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Settings, 
  Clock, 
  TrendingUp, 
  Mail, 
  ExternalLink,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight
} from "lucide-react";

import { API_BASE } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const fetcher = (url: string) => axios.get(url).then(r => r.data);

export default function Home() {
  const { data, isLoading, mutate } = useSWR(`${API_BASE}/api/status`, fetcher, { 
    refreshInterval: 5000,
    revalidateOnFocus: false 
  });
  const [running, setRunning] = useState(false);

  const status = data?.status ?? {};
  const config = data?.config ?? null;

  async function runNow() {
    if (!config) {
      toast.error("Please configure a report first");
      return;
    }
    
    try {
      setRunning(true);
      await axios.post(`${API_BASE}/api/run-now`);
      toast.success("Report generation started!");
      mutate();
    } catch (e: any) {
      toast.error(String(e?.response?.data?.error ?? "Failed to run"));
    } finally {
      setRunning(false);
    }
  }

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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              <BarChart3 className="w-4 h-4" />
              Insight Reports Platform
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Scheduled Insight Reports
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Automate your advertising insights with AI-powered reports for Meta and TikTok platforms
            </p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/config">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105">
                <Settings className="w-5 h-5 mr-2" />
                Configure Report
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            {config && (
              <Button 
                size="lg" 
                variant="outline" 
                onClick={runNow} 
                disabled={running}
                className="w-full sm:w-auto border-blue-200 hover:bg-blue-50 transition-all duration-200"
              >
                {running ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Run Now
                  </>
                )}
              </Button>
            )}
          </motion.div>

          {/* Dashboard Section */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-slate-600">Loading dashboard...</span>
                  </div>
                ) : !config ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-12 space-y-4"
                  >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <Settings className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">No Configuration Found</h3>
                    <p className="text-slate-600 max-w-md mx-auto">
                      Get started by configuring your first report. Choose your platform, metrics, and schedule.
                    </p>
                    <Link href="/config">
                      <Button className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <Settings className="w-4 h-4 mr-2" />
                        Configure Now
                      </Button>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Configuration Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border border-blue-100 bg-blue-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-700">Platform</p>
                              <p className="text-lg font-bold text-blue-900 capitalize">{config.platform}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-green-100 bg-green-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-700">Cadence</p>
                              <p className="text-lg font-bold text-green-900 capitalize">{config.cadence}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-purple-100 bg-purple-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              {config.delivery === "email" ? (
                                <Mail className="w-5 h-5 text-purple-600" />
                              ) : (
                                <ExternalLink className="w-5 h-5 text-purple-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-purple-700">Delivery</p>
                              <p className="text-lg font-bold text-purple-900 capitalize">{config.delivery}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Status Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-0 bg-slate-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-600" />
                            Execution Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Last Run:</span>
                            <span className="text-sm text-slate-800">
                              {status.lastRunAt ? new Date(status.lastRunAt).toLocaleString() : "Never"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Next Run:</span>
                            <span className="text-sm text-slate-800">
                              {status.nextRunAt ? new Date(status.nextRunAt).toLocaleString() : "Manual only"}
                            </span>
                          </div>
                          {status.lastError ? (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-700">Last Error:</p>
                                <p className="text-xs text-red-600 mt-1">{status.lastError}</p>
                              </div>
                            </div>
                          ) : status.lastRunAt && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <p className="text-sm font-medium text-green-700">Last run completed successfully</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-0 bg-slate-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-slate-600" />
                            Report Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">Metrics:</p>
                            <div className="flex flex-wrap gap-1">
                              {config.metrics.map((metric: string) => (
                                <span key={metric} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {metric}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Level:</span>
                            <span className="text-sm text-slate-800 capitalize">{config.level}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Date Range:</span>
                            <span className="text-sm text-slate-800 capitalize">{config.dateRangeEnum}</span>
                          </div>
                          {status.latestPublicUrl && (
                            <a 
                              href={status.latestPublicUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Latest Report
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button 
                        onClick={runNow} 
                        disabled={running}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                      >
                        {running ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Report Now
                          </>
                        )}
                      </Button>
                      <Link href="/config" className="flex-1">
                        <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 transition-all duration-200">
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Configuration
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
