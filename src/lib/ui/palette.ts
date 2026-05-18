import type { StageCode } from "@/domain/pcf/stages";
import type { GhgScope } from "@/domain/pcf/scopes";

export const STAGE_COLOR: Record<StageCode, string> = {
  RAW_MATERIAL: "#047857",
  PRODUCTION: "#0e7490",
  TRANSPORT: "#b45309",
  USE: "#6366f1",
  END_OF_LIFE: "#64748b",
};

export const SCOPE_COLOR: Record<GhgScope, string> = {
  SCOPE_1: "#dc2626",
  SCOPE_2: "#f59e0b",
  SCOPE_3: "#059669",
};

export const SCOPE_SHORT: Record<GhgScope, string> = {
  SCOPE_1: "Scope 1",
  SCOPE_2: "Scope 2",
  SCOPE_3: "Scope 3",
};
