/**
 * Test script to hit the MantraCare WhatsApp Webhook
 * 
 * Default URL:
 * https://workflows.mantracare.com/webhook/whatsapp-webhook?phone=9015982614&country-code=91&name=Navodya&domain=mc&opt11=trigger_price_ma_mc&opt2=therapy%3Fsource%3Dwa-ma&client_id=123456
 * 
 * Usage:
 *   node utility/test-whatsapp-webhook.js
 *   node utility/test-whatsapp-webhook.js --post
 *   node utility/test-whatsapp-webhook.js --phone=9876543210 --name="John Doe"
 */

const DEFAULT_WEBHOOK_URL =
  "https://workflows.mantracare.com/webhook/whatsapp-webhook?phone=9015982614&country-code=91&name=Navodya&domain=mc&opt11=trigger_price_ma_mc&opt2=therapy%3Fsource%3Dwa-ma&client_id=123456";

async function hitWebhook() {
  const args = process.argv.slice(2);
  const isPost = args.includes("--post");

  const urlObj = new URL(DEFAULT_WEBHOOK_URL);

  // Parse optional CLI overrides like --phone=1234567890 or --name=Jane
  for (const arg of args) {
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, value] = arg.slice(2).split("=");
      if (key && value !== undefined) {
        urlObj.searchParams.set(key, value);
      }
    }
  }

  const finalUrl = urlObj.toString();
  const method = isPost ? "POST" : "GET";

  console.log("==================================================");
  console.log("🚀 Testing WhatsApp Webhook");
  console.log("==================================================");
  console.log(`Timestamp : ${new Date().toISOString()}`);
  console.log(`Method    : ${method}`);
  console.log(`Target URL: ${finalUrl}`);
  console.log("--------------------------------------------------");
  console.log("Query Parameters:");
  for (const [key, value] of urlObj.searchParams.entries()) {
    console.log(`  • ${key.padEnd(14)}: ${value}`);
  }
  console.log("--------------------------------------------------");

  const startTime = Date.now();

  try {
    const fetchOptions = {
      method,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "MantraAssist-Webhook-Tester/1.0",
      },
    };

    if (method === "POST") {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(Object.fromEntries(urlObj.searchParams.entries()));
    }

    console.log(`Sending ${method} request...`);
    const response = await fetch(finalUrl, fetchOptions);
    const duration = Date.now() - startTime;

    console.log(`\n📥 Response Received in ${duration}ms:`);
    console.log(`Status     : ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get("content-type") || "unknown"}`);

    const rawBody = await response.text();
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = null;
    }

    console.log("Response Body:");
    if (parsedBody) {
      console.dir(parsedBody, { depth: null, colors: true });
    } else {
      console.log(rawBody || "<empty body>");
    }

    console.log("==================================================");
    if (response.ok) {
      console.log("✅ Webhook triggered successfully!");
    } else {
      console.log(`⚠️ Webhook returned HTTP error: ${response.status}`);
    }
    console.log("==================================================");

    return {
      ok: response.ok,
      status: response.status,
      duration,
      body: parsedBody || rawBody,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Failed to trigger webhook in ${duration}ms:`);
    console.error(error?.message || error);
    console.log("==================================================");
    process.exit(1);
  }
}

hitWebhook();
