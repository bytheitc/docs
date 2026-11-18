// The First Hundred: every launch task, as data. New tasks become GitHub issues labelled
// `first-hundred` and `track:<track>` (create-issues.mjs). Issues that already exist are closed or
// rewritten and labelled (tasks/existing.mjs). Each project's new tasks live in tasks/<project>.mjs.
import { HIFZ } from "./tasks/hifz.mjs";
import { IJAAZAH } from "./tasks/ijaazah.mjs";
import { KHUTBAH } from "./tasks/khutbah.mjs";
import { ZAKAT } from "./tasks/zakat.mjs";
import { CLOSE, REFRESH } from "./tasks/existing.mjs";

export const TASKS = [...IJAAZAH, ...KHUTBAH, ...HIFZ, ...ZAKAT];
export { CLOSE, REFRESH };
