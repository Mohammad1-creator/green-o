import { Badge } from "@/components/ui/badge";

import {
  FAULT_STATUS_LABELS,
  type FaultStatus,
  MACHINE_STATUS_LABELS,
  type MachineStatus,
} from "../labels";

const MACHINE_VARIANTS: Record<
  MachineStatus,
  "secondary" | "destructive" | "outline" | "default"
> = {
  operational: "secondary",
  down: "destructive",
  under_maintenance: "default",
  retired: "outline",
};

const FAULT_VARIANTS: Record<
  FaultStatus,
  "secondary" | "destructive" | "outline" | "default"
> = {
  open: "destructive",
  assigned: "default",
  resolved: "secondary",
  rejected: "outline",
};

export function MachineStatusBadge({ status }: { status: MachineStatus }) {
  return (
    <Badge variant={MACHINE_VARIANTS[status]}>
      {MACHINE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function FaultStatusBadge({
  status,
  stopped = false,
}: {
  status: FaultStatus;
  stopped?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={FAULT_VARIANTS[status]}>
        {FAULT_STATUS_LABELS[status]}
      </Badge>
      {stopped && (status === "open" || status === "assigned") ? (
        <Badge variant="destructive">الآلة متوقفة</Badge>
      ) : null}
    </span>
  );
}
