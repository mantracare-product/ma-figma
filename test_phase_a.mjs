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
    if (msg.type() === "error") console.log("PAGE ERROR:", msg.text());
  });

  console.log(`Navigating to ${BASE_URL}/admin/custom-fields...`);
  await page.goto(`${BASE_URL}/admin/custom-fields`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Take initial screenshot with Simulator
  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_simulator_and_table.png",
    fullPage: false,
  });
  console.log("Screenshot phase_a_simulator_and_table.png saved.");

  // Click Add Field to open drawer
  console.log("Opening Add Field drawer...");
  const addFieldBtn = page.locator("button:has-text('Add Field')");
  await addFieldBtn.click();
  await page.waitForTimeout(600);

  // Fill in field name
  const nameInput = page.locator("input[placeholder='e.g. Policy Coverage']");
  await nameInput.fill("Cardiac Echo Report");

  // Select Healthcare category
  const categorySelect = page.locator("select").nth(1); // 0 is assign section, 1 is industry category
  // Let's find by label text
  const catDropdown = page.locator("label:has-text('Industry Category') + select");
  await catDropdown.selectOption("Healthcare");
  await page.waitForTimeout(300);

  const indDropdown = page.locator("label:has-text('Industry Specialization') + select");
  await indDropdown.selectOption("Cardiologist");
  await page.waitForTimeout(300);

  // Select California location button
  const calBtn = page.locator("button:has-text('California')");
  await calBtn.click();
  await page.waitForTimeout(300);

  // Capture screenshot of drawer with scoping
  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_field_drawer_scoping.png",
    fullPage: false,
  });
  console.log("Screenshot phase_a_field_drawer_scoping.png saved.");

  // Click Create Field
  const createFieldSubmit = page.locator("button:has-text('Create Field')");
  await createFieldSubmit.click();
  await page.waitForTimeout(800);

  // Now test the Simulator filtering
  console.log("Testing Simulator with Automobile (non-matching)...");
  const simCat = page.locator("label:has-text('Simulate Category') + select");
  await simCat.selectOption("Automobile");
  await page.waitForTimeout(600);

  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_simulation_filtering.png",
    fullPage: false,
  });
  console.log("Screenshot phase_a_simulation_filtering.png saved.");

  // Test Dev Switcher modal
  console.log("Opening Dev Switcher modal...");
  const devSwitcherBtn = page.locator("button:has-text('Active Org:')");
  await devSwitcherBtn.click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: "C:/Users/Mantra/.gemini/antigravity-ide/brain/b5c930fd-35ef-49f1-869a-b021a5884f10/phase_a_runtime_dev_switcher.png",
    fullPage: false,
  });
  console.log("Screenshot phase_a_runtime_dev_switcher.png saved.");

  await browser.close();
  console.log("Phase A verification completed successfully!");
}

run().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
