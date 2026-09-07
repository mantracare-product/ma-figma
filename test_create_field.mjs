import { createRequire } from "module";
const require = createRequire("c:\\Users\\Mantra\\.gemini\\antigravity\\scratch\\ma-figma\\package.json");
const { chromium } = require("playwright-core");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5174";

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem("auth_token", "dummy_token");
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    console.log(`[BROWSER LOG] ${msg.type()}: ${msg.text()}`);
  });

  await page.goto(`${BASE_URL}/admin/custom-fields`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  console.log("Clicking Add Field...");
  await page.click("button:has-text('Add Field')");
  await page.waitForTimeout(500);

  console.log("Typing label...");
  await page.fill("input[placeholder='e.g. Policy Coverage']", "Cardiac Echo Report");
  await page.waitForTimeout(300);

  // Check key value
  const keyValue = await page.inputValue("input[placeholder='policy_coverage']");
  console.log("Auto-generated key is:", keyValue);

  console.log("Selecting Healthcare category in drawer...");
  const drawer = page.locator("div[style*='slideInFromRight']");
  const catSelect = drawer.locator("label:has-text('Industry Category') + select");
  await catSelect.selectOption({ label: "Healthcare" });
  await page.waitForTimeout(300);

  console.log("Selecting Cardiologist industry in drawer...");
  const indSelect = drawer.locator("label:has-text('Industry Specialization') + select");
  await indSelect.selectOption({ label: "Cardiologist" });
  await page.waitForTimeout(300);

  console.log("Selecting California location in drawer...");
  await drawer.locator("button:text-is('California')").click();
  await page.waitForTimeout(300);

  console.log("Submitting Create Field...");
  const submitBtn = drawer.locator("button:has-text('Create Field')");
  const isDisabled = await submitBtn.isDisabled();
  console.log("Submit button disabled:", isDisabled);
  await submitBtn.click();
  await page.waitForTimeout(800);

  // Check if drawer closed
  const drawerVisible = await page.isVisible("h2:has-text('New Custom Field')");
  console.log("Drawer still visible:", drawerVisible);

  // Take screenshot of table after creation
  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_after_field_create.png",
    fullPage: false,
  });

  // Now search for Cardiac
  await page.fill("input[placeholder='Search fields...']", "Cardiac");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_cardiac_search_unsimulated.png",
    fullPage: false,
  });

  // Simulate Automobile
  console.log("Simulating Automobile (non-matching)...");
  const simCatSelect = page.locator("label:has-text('Simulate Category') + select");
  await simCatSelect.selectOption("Automobile");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_cardiac_search_dimmed.png",
    fullPage: false,
  });

  // Simulate Healthcare -> Cardiologist -> California
  console.log("Simulating Healthcare + Cardiologist + California (matching)...");
  await simCatSelect.selectOption("Healthcare");
  await page.waitForTimeout(300);
  const simIndSelect = page.locator("label:has-text('Simulate Industry') + select");
  await simIndSelect.selectOption("Cardiologist");
  await page.waitForTimeout(300);
  const simLocSelect = page.locator("label:has-text('Simulate Location') + select");
  await simLocSelect.selectOption("California");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_cardiac_search_matching.png",
    fullPage: false,
  });

  await browser.close();
  console.log("All done!");
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
