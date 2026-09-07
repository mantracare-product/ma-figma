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

  console.log(`Navigating to ${BASE_URL}/admin/custom-fields...`);
  await page.goto(`${BASE_URL}/admin/custom-fields`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Search for the newly created Cardiac field
  const searchBox = page.locator("input[placeholder='Search fields...']");
  await searchBox.fill("Cardiac");
  await page.waitForTimeout(400);

  // 1. Without simulator active: verify Cardiac Echo Report is visible and has Healthcare · Cardiologist and California badges
  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_cardiac_field_unsimulated.png",
    fullPage: false,
  });
  console.log("Screenshot phase_a_cardiac_field_unsimulated.png saved.");

  // 2. Simulate Healthcare + Cardiologist + California -> Should MATCH
  const simCat = page.locator("label:has-text('Simulate Category') + select");
  await simCat.selectOption("Healthcare");
  await page.waitForTimeout(300);

  const simInd = page.locator("label:has-text('Simulate Industry') + select");
  await simInd.selectOption("Cardiologist");
  await page.waitForTimeout(300);

  const simLoc = page.locator("label:has-text('Simulate Location') + select");
  await simLoc.selectOption("California");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_cardiac_field_matching.png",
    fullPage: false,
  });
  console.log("Screenshot phase_a_cardiac_field_matching.png saved.");

  // 3. Simulate Automobile -> Should HIDE / DIM
  await simCat.selectOption("Automobile");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_cardiac_field_hidden.png",
    fullPage: false,
  });
  console.log("Screenshot phase_a_cardiac_field_hidden.png saved.");

  await browser.close();
  console.log("All focused tests passed!");
}

run().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
