"""
Phorest API Diagnostic & Integration Testing Harness
---------------------------------------------------
A complete testing utility for Phorest Salon & Clinic API integration with MantraAssist.

Usage:
  python scripts/phorest_test.py --username <USERNAME> --password <PASSWORD> --business-id <BUSINESS_ID> [--region US|EU]
Or set environment variables:
  set PHOREST_USERNAME=<USERNAME>
  set PHOREST_PASSWORD=<PASSWORD>
  set PHOREST_BUSINESS_ID=<BUSINESS_ID>
  set PHOREST_REGION=US (or EU)
  python scripts/phorest_test.py
"""

import sys
import os
import json
import base64
import argparse
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timedelta

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

GATEWAYS = {
    "US": "https://api-gateway-us.phorest.com/third-party-api-server",
    "EU": "https://api-gateway-eu.phorest.com/third-party-api-server",
    "PLATFORM": "https://platform.phorest.com/third-party-api-server"
}

class PhorestClient:
    def __init__(self, username: str, password: str, business_id: str, region: str = "US"):
        self.username = username.strip()
        self.password = password.strip()
        self.business_id = business_id.strip()
        self.region = region.upper()
        self.base_url = GATEWAYS.get(self.region, GATEWAYS["US"])
        
        # Build Basic Auth header
        auth_str = f"{self.username}:{self.password}"
        b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
        self.auth_header = f"Basic {b64_auth}"
        
        self.branches = []
        self.primary_branch = None

    def _request(self, method: str, endpoint: str, params: dict = None, body: dict = None):
        url = f"{self.base_url}{endpoint}"
        if params:
            query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None}, doseq=True)
            url = f"{url}?{query}"

        headers = {
            "Authorization": self.auth_header,
            "Accept": "application/json",
            "User-Agent": "MantraAssist-Integration/1.0"
        }

        data_bytes = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data_bytes = json.dumps(body).encode("utf-8")

        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = resp.read().decode("utf-8")
                return resp.status, json.loads(resp_data) if resp_data else {}
        except urllib.error.HTTPError as e:
            err_data = e.read().decode("utf-8")
            try:
                parsed_err = json.loads(err_data)
            except Exception:
                parsed_err = {"raw": err_data}
            return e.code, parsed_err
        except Exception as e:
            return 500, {"error": str(e)}

    def test_handshake(self):
        print(f"\n[1/6] Testing Phorest Basic Auth & Gateway Handshake ({self.base_url})...")
        endpoint = f"/api/business/{self.business_id}/branch"
        status, data = self._request("GET", endpoint, params={"size": 10})
        
        if status != 200:
            print(f"❌ Handshake failed (HTTP {status}): {data}")
            return False

        branches = data.get("_embedded", {}).get("branches", [])
        if not branches:
            print(f"⚠️ Authenticated successfully, but no branches were returned for business {self.business_id}.")
            return False

        self.branches = branches
        self.primary_branch = branches[0]
        print(f"✅ Handshake successful! Found {len(branches)} branch(es).")
        for b in branches:
            print(f"   • Branch: {b.get('name')} (ID: {b.get('branchId')})")
            print(f"     Timezone: {b.get('timeZone')}, City: {b.get('city')}, Phone/Postal: {b.get('postalCode')}")
        return True

    def test_fetch_staff(self):
        branch_id = self.primary_branch.get("branchId")
        print(f"\n[2/6] Querying Staff & Providers for Branch: {self.primary_branch.get('name')} (GET /staff)...")
        endpoint = f"/api/business/{self.business_id}/branch/{branch_id}/staff"
        status, data = self._request("GET", endpoint, params={"size": 5})
        
        if status != 200:
            print(f"⚠️ Failed to fetch staff (HTTP {status}): {data}")
            return []

        staff_list = data.get("_embedded", {}).get("staffs", [])
        print(f"✅ Retrieved {len(staff_list)} staff members:")
        for s in staff_list:
            print(f"   • {s.get('firstName')} {s.get('lastName')} (ID: {s.get('staffId')}, Category: {s.get('staffCategoryName')})")
        return staff_list

    def test_fetch_services(self):
        branch_id = self.primary_branch.get("branchId")
        print(f"\n[3/6] Querying Services & Treatments (GET /service)...")
        endpoint = f"/api/business/{self.business_id}/branch/{branch_id}/service"
        status, data = self._request("GET", endpoint, params={"size": 5})
        
        if status != 200:
            print(f"⚠️ Failed to fetch services (HTTP {status}): {data}")
            return []

        services = data.get("_embedded", {}).get("services", [])
        print(f"✅ Retrieved {len(services)} services:")
        for svc in services:
            print(f"   • {svc.get('name')} (ID: {svc.get('serviceId')}) - Price: {svc.get('price')}, Duration: {svc.get('duration')} mins")
        return services

    def test_query_clients(self):
        print(f"\n[4/6] Querying Clients (GET /client)...")
        endpoint = f"/api/business/{self.business_id}/client"
        status, data = self._request("GET", endpoint, params={"size": 5})
        
        if status != 200:
            print(f"⚠️ Failed to fetch clients (HTTP {status}): {data}")
            return []

        clients = data.get("_embedded", {}).get("clients", [])
        print(f"✅ Retrieved {len(clients)} sample clients:")
        for c in clients:
            print(f"   • {c.get('firstName')} {c.get('lastName')} (ID: {c.get('clientId')}, Mobile: {c.get('mobile')})")
        return clients

    def test_appointment_availability(self, service_id: str):
        branch_id = self.primary_branch.get("branchId")
        print(f"\n[5/6] Testing Slot Availability (POST /appointments/availability)...")
        endpoint = f"/api/business/{self.business_id}/branch/{branch_id}/appointments/availability"
        
        now = datetime.utcnow()
        start = (now + timedelta(days=1)).strftime("%Y-%m-%dT09:00:00Z")
        end = (now + timedelta(days=3)).strftime("%Y-%m-%dT18:00:00Z")

        body = {
            "startTime": start,
            "endTime": end,
            "isOnlineAvailability": True,
            "clientServiceSelections": [
                {
                    "serviceSelections": [
                        {
                            "serviceId": service_id
                        }
                    ]
                }
            ]
        }

        status, data = self._request("POST", endpoint, body=body)
        if status != 200:
            print(f"⚠️ Slot availability returned HTTP {status}: {data}")
            return []

        slots = data.get("data", [])
        print(f"✅ Slot availability queried successfully! Found {len(slots)} available slot(s).")
        for s in slots[:3]:
            print(f"   • Slot Start: {s.get('startTime')}")
        return slots

    def test_lead_capture(self):
        branch_id = self.primary_branch.get("branchId")
        print(f"\n[6/6] Testing Lead Creation (POST /leads)...")
        endpoint = f"/api/business/{self.business_id}/branch/{branch_id}/leads"
        
        test_payload = {
            "businessId": self.business_id,
            "branchId": branch_id,
            "firstName": "MantraAssist",
            "lastName": "TestLead",
            "mobile": "+15550009999",
            "email": "testlead@mantraassist.com",
            "source": "MantraAssist AI Test Suite",
            "contactableByMobile": True,
            "contactableByEmail": True,
            "marketingOptIn": True,
            "note": "Diagnostic verification test lead from MantraAssist"
        }

        status, data = self._request("POST", endpoint, body=test_payload)
        if status in [200, 201]:
            print(f"✅ Lead creation succeeded (HTTP {status}): {data}")
            return True
        else:
            print(f"⚠️ Lead creation returned HTTP {status}: {data}")
            return False

def main():
    parser = argparse.ArgumentParser(description="Test Phorest API Integration with MantraAssist")
    parser.add_argument("--username", default=os.environ.get("PHOREST_USERNAME"), help="Phorest API Username (e.g. global/...)")
    parser.add_argument("--password", default=os.environ.get("PHOREST_PASSWORD"), help="Phorest API Password")
    parser.add_argument("--business-id", default=os.environ.get("PHOREST_BUSINESS_ID"), help="Phorest Business ID")
    parser.add_argument("--region", default=os.environ.get("PHOREST_REGION", "US"), help="Phorest Region (US or EU)")
    args = parser.parse_args()

    if not args.username or not args.password or not args.business_id:
        print("=" * 70)
        print("MantraAssist x Phorest Diagnostic Test Suite")
        print("=" * 70)
        print("Please provide the credentials:")
        print("  python scripts/phorest_test.py --username <USER> --password <PASS> --business-id <BIZ_ID> [--region US|EU]")
        print("Or set environment variables:")
        print("  set PHOREST_USERNAME=<USER>")
        print("  set PHOREST_PASSWORD=<PASS>")
        print("  set PHOREST_BUSINESS_ID=<BIZ_ID>")
        print("=" * 70)
        return

    print("=" * 70)
    print(f"🚀 Running Phorest Diagnostic Test Harness (Region: {args.region})")
    print("=" * 70)

    client = PhorestClient(args.username, args.password, args.business_id, args.region)
    if not client.test_handshake():
        sys.exit(1)

    staff = client.test_fetch_staff()
    services = client.test_fetch_services()
    clients = client.test_query_clients()

    if services:
        first_service_id = services[0].get("serviceId")
        client.test_appointment_availability(first_service_id)

    client.test_lead_capture()

    print("\n" + "=" * 70)
    print("🎉 Phorest Integration Diagnostic Completed!")
    print("=" * 70)

if __name__ == "__main__":
    main()

