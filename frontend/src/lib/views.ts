import type { View } from "./types";

/** Header labels per screen. Kept out of Sidebar.tsx so that file only exports
 *  components and stays eligible for React fast refresh. */
export const VIEW_TITLES: Record<View, string> = {
  library: "Script Library",
  run: "Run Script",
  builder: "Editor",
  objections: "Objections",
  reports: "Reports",
  settings: "Settings",
};

/** Screens a CSR uses live on a call — these are read-only. */
export const USE_VIEWS: View[] = ["library", "run"];
