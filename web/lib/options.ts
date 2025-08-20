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
    { label: "Every 12 hours", value: "every 12 hours" },
    { label: "Daily", value: "daily" }
  ] as const;
  
  export const DELIVERY_OPTIONS = [
    { label: "Email", value: "email" },
    { label: "Public Link", value: "link" }
  ] as const;
  
  export const META_METRICS = [
    "spend","impressions","clicks","ctr","cpc","reach","frequency",
    "conversions","cost_per_conversion","conversion_rate","actions",
    "cost_per_action_type"
  ];
  
  export const META_LEVELS = ["account","campaign","adset","ad"];
  
  export const TIKTOK_METRICS = [
    "spend","impressions","clicks","conversions","cost_per_conversion",
    "conversion_rate","ctr","cpc","reach","frequency","skan_app_install",
    "skan_cost_per_app_install","skan_purchase","skan_cost_per_purchase"
  ];
  
  export const TIKTOK_LEVELS = ["AUCTION_ADVERTISER","AUCTION_AD","AUCTION_CAMPAIGN"];
  