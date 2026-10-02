import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

const ADMIN_PASSWORD = "e2e-secret";

async function adminLogin(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

test.describe("public catalog", () => {
  test("shows the catalog with count, filters, search, layout and pagination", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find a project");
    await expect(page.getByText("240 projects")).toBeVisible();

    // industry chip
    await page.getByRole("navigation", { name: "Industry" }).getByRole("link", { name: "Finance", exact: true }).click();
    await expect(page).toHaveURL(/industry=finance/);
    await expect(page.getByText("30 projects")).toBeVisible();
    for (const label of await page.locator("article p.uppercase").allTextContents()) expect(label).toBe("Finance");

    // search narrows results
    await page.getByRole("searchbox", { name: "Search" }).fill("credit risk");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=credit\+risk/);
    const count = await page.locator("article").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(30);

    // open-only toggle + list layout survive in the URL
    await page.goto("/projects?open=1&view=list");
    await expect(page.locator("article").first()).toContainText("Applications open");
    await page.getByRole("link", { name: "grid" }).click();
    await expect(page).toHaveURL(/open=1/);
    await expect(page).not.toHaveURL(/view=list/);

    // pagination
    await page.goto("/projects");
    await page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("page 2 of 20")).toBeVisible();
  });

  test("project detail shows cohorts and links to instructor", async ({ page }) => {
    await page.goto("/projects?open=1");
    await page.locator("article h3 a").first().click();
    await expect(page.getByRole("heading", { name: "What you will learn" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cohorts and applications" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Apply to this cohort" }).first()).toBeVisible();
    await page.getByRole("region", { name: "Your instructor" }).getByRole("link").click();
    await expect(page).toHaveURL(/\/instructors\//);
  });

  test("unknown project and application ids 404", async ({ page }) => {
    expect((await page.goto("/projects/nope-not-real"))?.status()).toBe(404);
    expect((await page.goto("/application/not-a-real-id"))?.status()).toBe(404);
  });
});

test.describe("security headers", () => {
  test("every response carries the baseline headers", async ({ request }) => {
    for (const path of ["/projects", "/admin/login"]) {
      const h = (await request.get(path)).headers();
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"]).toContain("camera=()");
      expect(h["content-security-policy-report-only"]).toContain("frame-ancestors 'none'");
    }
  });
});

test.describe("admin access control", () => {
  test("redirects anonymous visitors and rejects a wrong password", async ({ page, request }) => {
    await page.goto("/admin/applications");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect password.")).toBeVisible();

    const res = await request.get("/admin/export", { maxRedirects: 0 });
    expect([301, 302, 307, 308, 401]).toContain(res.status());
  });

  test("a forged session cookie does not grant access", async ({ page, context }) => {
    await context.addCookies([{ name: "hub_admin", value: "9999999999.deadbeef", url: "http://localhost:3100" }]);
    await page.goto("/admin/applications");
    await expect(page).toHaveURL(/\/admin\/login/);
    const res = await context.request.get("/admin/export", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});

test.describe.serial("apply, review and export", () => {
  const email = `e2e.${Date.now()}@example.edu`;

  test("form validates, then a student can apply once", async ({ page }) => {
    await page.goto("/projects?open=1");
    await page.locator("article h3 a").first().click();
    await page.getByRole("link", { name: "Apply to this cohort" }).first().click();
    await expect(page).toHaveURL(/\/apply\//);
    const applyUrl = page.url();

    // empty submit shows field errors and stays put
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText("Enter your full name")).toBeVisible();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Tell us a little more")).toBeVisible();
    await expect(page).toHaveURL(applyUrl);

    const fill = async () => {
      await page.getByLabel("Full name").fill("E2E Student");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("School").fill("Lakeview University");
      await page.getByLabel("Program or major").fill("B.S. Computer Science");
      await page.getByLabel("Expected graduation year").selectOption("2027");
      await page.getByLabel("Why do you want to join this project?").fill("I want a realistic project for my portfolio and honest feedback.");
    };
    await fill();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page).toHaveURL(/\/application\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible();
    await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
    // the student-facing page never shows the email
    await expect(page.locator("body")).not.toContainText(email);

    // second application with the same email to the same cohort is blocked
    await page.goto(applyUrl);
    await fill();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText("An application with this email already exists")).toBeVisible();
  });

  test("admin finds it, accepts it, and the Excel export contains it", async ({ page }) => {
    await adminLogin(page);
    await page.goto(`/admin/applications?q=${encodeURIComponent(email)}`);
    await expect(page.getByText("1 application", { exact: false }).first()).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText("E2E Student");

    await page.getByRole("checkbox", { name: "Select E2E Student" }).check();
    await page.getByLabel("Set selected to").selectOption("accepted");
    await page.getByRole("button", { name: "Apply to selected" }).click();
    await expect(page.getByRole("status")).toContainText("Updated 1 application");
    await expect(page.locator("tbody tr").first()).toContainText("Accepted");

    // submitting with nothing selected is a clear error, not a crash
    await page.getByRole("button", { name: "Apply to selected" }).click();
    await expect(page.getByText("Select at least one application first.")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export these to Excel" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^project-hub-applications-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const path = await download.path();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Applications", "Cohort capacity"]);
    const sheet = wb.getWorksheet("Applications")!;
    const headers = (sheet.getRow(1).values as unknown[]).slice(1);
    expect(headers).toEqual(expect.arrayContaining(["Student name", "Email", "Status", "Project", "Statement"]));
    expect(sheet.rowCount).toBe(2); // header + the single filtered application
    const emailCol = headers.indexOf("Email") + 1;
    expect(sheet.getRow(2).getCell(emailCol).value).toBe(email);
    expect(sheet.getRow(2).getCell(headers.indexOf("Status") + 1).value).toBe("Accepted");
  });

  test("admin cohort capacity view loads and links to applications", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/cohorts?status=full");
    await expect(page.getByRole("heading", { name: "Cohorts" })).toBeVisible();
    const first = page.locator("tbody tr").first();
    await expect(first).toContainText("Cohort full");
    await first.getByRole("link").nth(1).click();
    await expect(page).toHaveURL(/\/admin\/applications\?cohort=/);
  });
  test("accepting into a full cohort turns the extras into waitlist entries", async ({ page }) => {
    await adminLogin(page);
    // the seeded demo cohort has one seat left and several pending applicants
    await page.goto("/admin/applications?cohort=coh-prj-1-1&status=submitted");
    const rows = page.locator("tbody tr");
    const n = await rows.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let k = 0; k < n; k++) await rows.nth(k).getByRole("checkbox").check();
    await page.getByLabel("Set selected to").selectOption("accepted");
    await page.getByRole("button", { name: "Apply to selected" }).click();
    await expect(page.getByRole("status")).toContainText(/became waitlist entries/);

    // the cohort is now full, and the public page agrees
    await page.goto("/admin/cohorts?status=full");
    await expect(page.locator("tbody tr", { hasText: "Discounted Cash Flow Valuation" }).first()).toBeVisible();
    await page.goto("/apply/coh-prj-1-1");
    await expect(page.getByText("This cohort is not accepting applications.")).toBeVisible();
  });
});
