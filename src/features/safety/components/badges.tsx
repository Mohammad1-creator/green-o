import { Badge } from "@/components/ui/badge";

import {
  SEVERITY_LABELS,
  VIOLATION_STATUS_LABELS,
  type ViolationSeverity,
  type ViolationStatus,
} from "../labels";

export function SeverityBadge({ severity }: { severity: ViolationSeverity }) {
  return (
    <Badge
      variant={
        severity === "critical" || severity === "high"
          ? "destructive"
          : "secondary"
      }
    >
      خطورة {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

export function ViolationStatusBadge({ status }: { status: ViolationStatus }) {
  return (
    <Badge
      variant={
        status === "pending" || status === "objected" ? "default" : "outline"
      }
    >
      {VIOLATION_STATUS_LABELS[status]}
    </Badge>
  );
}
