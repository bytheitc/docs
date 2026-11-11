// Lets `node` run the app's TypeScript modules directly for tests: resolves "@/x" to the project root and
// extensionless relative imports to ".ts". Node strips the types itself.
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`
  const root = ${JSON.stringify(new URL("../", import.meta.url).href)};
  export async function resolve(spec, ctx, next) {
    if (spec.startsWith("@/")) spec = root + spec.slice(2);
    try { return await next(spec, ctx); }
    catch (e) {
      if ((spec.startsWith(".") || spec.startsWith("file:")) && !/\\.[mc]?[jt]s$/.test(spec)) return next(spec + ".ts", ctx);
      throw e;
    }
  }`));
