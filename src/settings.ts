// src/settings.ts

export interface Settings {
  appName: string
  timezone: string
  cacheTTL: number // seconds
  outageCheckHour: string // e.g. "00:30"
  baleToken: string
  dbPath: string
  debug: boolean

  scrapUrl: string
}

export const settings: Settings = {
  appName: "قطعی برق قم",
  timezone: "Asia/Tehran",
  cacheTTL: 3600, // 1 hour
  outageCheckHour: "00:30",
  baleToken: process.env.BALE_TOKEN || "",
  dbPath: process.env.DB_PATH || "./db/users.json",
  debug: process.env.DEBUG === "true",

  scrapUrl: 'https://qepd.co.ir/fa-IR/DouranPortal/6423',
}
