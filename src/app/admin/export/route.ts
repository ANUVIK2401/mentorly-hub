import type { NextRequest } from "next/server";
import { getRepo } from "@/data";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/data/types";
import { isAdmin } from "@/lib/auth";
import { buildWorkbook } from "@/lib/export";

/** GET /admin/export?status=&cohort=&q=  ->  .xlsx of the (optionally filtered) applications. */
export async function GET(request: NextRequest) {
  // Route handlers get no layout protection, so check here.
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const statusParam = (sp.get("status") ?? "") as ApplicationStatus;
  const status = APPLICATION_STATUSES.includes(statusParam) ? statusParam : undefined;
  const cohortId = sp.get("cohort") || undefined;
  const q = sp.get("q")?.trim().slice(0, 100) || undefined;

  const repo = getRepo();
  const [applications, cohorts] = await Promise.all([
    repo.exportApplications({ status, cohortId, q }),
    repo.listCohortRows(),
  ]);
  const file = await buildWorkbook(applications, cohorts);

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Blob([file as BlobPart]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="project-hub-applications-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
