export const PLATFORM_OPTIONS = [
    { label: "Meta", value: "meta" },
    { label: "TikTok", value: "tiktok" }
  ] as const;
  
  export const DATE_RANGE_OPTIONS = [
    { label: "Last 7 days", value: "last7" },
    { label: "Last 14 days", value: "last14" },
    { label: "Last 30 days", value: "last30" }
  ] as const;
  
  export const CADENCE_OPTIONS = [
    { label: "Manual", value: "manual" },
    { label: "Hourly", value: "hourly" },
    { label: "Every 12 hours", value: "every12h" },
    { label: "Daily", value: "daily" }
  ] as const;
  
  export const DELIVERY_OPTIONS = [
    { label: "Email", value: "email" },
    { label: "Public Link", value: "link" }
  ] as const;
  
  export const META_METRICS = [
    "spend","impressions","clicks","ctr","conversions",
    "cost_per_conversion","reach","frequency"
  ];
  
  export const META_LEVELS = ["account","campaign","adset","ad"];
  
  export const TIKTOK_METRICS = [
    "spend","impressions","clicks","conversions","cost_per_conversion",
    "conversion_rate","ctr","cpc","reach","frequency"
  ];
  
  export const TIKTOK_LEVELS = ["AUCTION_ADVERTISER","AUCTION_AD","AUCTION_CAMPAIGN"];
  