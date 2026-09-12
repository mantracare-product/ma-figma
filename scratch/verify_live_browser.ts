import { chromium } from "playwright";

async function verifyLiveClientScreen() {
  const browser = await chromium.connectOverCDP("http://localhost:9222").catch(() => null);
  let page;

  if (browser) {
    const contexts = browser.contexts();
    if (contexts.length > 0) {
      const pages = contexts[0].pages();
      page = pages.find(p => p.url().includes("CL-006")) || pages[0];
    }
  }

  if (!page) {
    const b = await chromium.launch({ headless: true });
    page = await b.newPage();
    await page.goto("http://localhost:5173/clients/CL-006");
    await page.waitForTimeout(2000);
  }

  const result = await page.evaluate(() => {
    const regRaw = localStorage.getItem("mantra_field_registry_v1");
    const reg = regRaw ? JSON.parse(regRaw) : {};
    const clientFields = (reg.client || []).filter((f: any) => 
      f.key === "primary_specialist" || f.key === "clinical_allergies" || f.inputType === "table" || f.inputType === "crm_bind" || f.inputType === "list_open"
    );

    // Get the actual DOM elements rendered in the Client Details section
    const labels = Array.from(document.querySelectorAll("label")).map(l => l.textContent?.trim());
    const crmSelect = document.querySelector("select");
    const crmOptions = crmSelect ? Array.from(crmSelect.querySelectorAll("option")).map(o => ({ value: o.value, text: o.textContent?.trim() })) : [];
    
    // Tag list items
    const tagElements = Array.from(document.querySelectorAll(".inline-flex span")).map(s => s.textContent?.trim());

    return {
      registrySavedFields: clientFields,
      renderedLabelsInDOM: labels.filter(l => l?.includes("PRIMARY SPECIALIST") || l?.includes("CLINICAL ALLERGIES") || l?.includes("EQUIPMENT")),
      crmBindOptionsInSelect: crmOptions.slice(0, 5),
      renderedTags: tagElements.filter(t => t === "Penicillin"),
      currentUrl: window.location.href,
    };
  });

  console.log("=== EXECUTED BROWSER STATE VERIFICATION ===");
  console.log(JSON.stringify(result, null, 2));

  if (!browser) {
    await page.context().browser()?.close();
  }
}

verifyLiveClientScreen().catch(console.error);
