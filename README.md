# WAQF Board Public Grievance Redressal Portal

Portal for the **Karnataka State Board of Auqaf** (KSBA), as specified in the 17.08.2026 software requisition.

## Run locally

```bash
cd backend
npm install
npm run init-db
npm run start:local
```

```bash
cd frontend
npm install
npm start
```

- Public portal: http://localhost:3010
- API: http://localhost:8010/api/health
- Database: `ksba_grievance` on `192.168.1.106`

## Official logins (password `Ksba@123`)

| Role | Email |
|---|---|
| Chairman | chairman@ksba.karnataka.gov.in |
| CEO | ceo@ksba.karnataka.gov.in |
| Additional CEO | aceo@ksba.karnataka.gov.in |
| Chief Accounts Officer | cao@ksba.karnataka.gov.in |
| Assistant Secretary | asst.secretary@ksba.karnataka.gov.in |
| PRO | pro@ksba.karnataka.gov.in |
| Divisional Manager 1–5 | dm1@ksba.karnataka.gov.in … dm5@ksba.karnataka.gov.in |

Public OTP (until SMS gateway): **123456**

## Workflow

1. Official (or public) saves the concern → **Reference ID** `KSBA/GRV/YYYY/NNNNNN`, status **Created**.
2. All official logins **except PRO** click **Forward to PRO** → status **Pending**.
3. PRO forwards to a Divisional Manager (Division 1–5 placeholder names).
4. Public and the DM are notified (in-portal + email if present; SMS is stubbed in the API log).
5. DM has **10 days** to enter **Action Taken** and send it back to PRO.
6. PRO **completes** or **reverts** to the DM.
7. Public can track by Reference ID. Dashboard pie chart shows Created / Pending / Completed.

Rs.10 complaint fee is stored on each record (`fee_applicable = 0`) and is not collected yet.
