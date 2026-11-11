import type { Status } from "@/lib/types";

const LABEL: Record<Status, string> = { draft: "Draft", review: "In review", published: "Live", archived: "Archived" };

export function StatusChip({ status, pending }: { status: Status; pending?: boolean }) {
  return (
    <span className="cms-chips">
      <span className={`cms-chip s-${status}`}>{LABEL[status]}</span>
      {pending && <span className="cms-chip s-pending">Changes pending</span>}
    </span>
  );
}
