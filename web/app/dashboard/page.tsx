"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page since dashboard is now integrated there
    router.replace("/");
  }, [router]);

  return null;
}
