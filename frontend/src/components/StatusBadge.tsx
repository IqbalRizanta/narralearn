import { Badge } from "./Card";
import type { JobStatus, SessionStatus } from "../lib/types";
import { JOB_STATUS_META, SESSION_STATUS_META } from "../lib/utils";

export function SessionStatusBadge({
  status,
}: {
  status: SessionStatus;
}) {
  const meta = SESSION_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const meta = JOB_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}
