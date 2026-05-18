# 📋 EMS BFS – Comprehensive Change Log (May 2026)

Below is a **single source of truth** that documents every modification made to the project during our recent pair‑programming sessions. The list is ordered chronologically and grouped by file, with a brief rationale for each edit. All changes are already applied to the repository, so you can treat this as the definitive changelog to be committed alongside the code.

---

## 1️⃣ `app/page.tsx` – Main Dashboard

| # | Change | Description | Reason |
|---|--------|-------------|--------|
| 1 | **Added `useEffect` import** (`import { useState, useMemo, useEffect } from 'react';`) | Needed for the new polling logic. | Enables side‑effects for real‑time fetching. |
| 2 | **Added `realtimeData` state** (`const [realtimeData, setRealtimeData] = useState<any>(null);`) | Holds the latest reading returned by the new API. | Separate from the historic bulk fetch. |
| 3 | **Inserted polling effect** (lines 147‑176) | ```tsx\nuseEffect(() => {\n  let interval: NodeJS.Timeout;\n  const fetchLatest = async () => { /* … */ };\n  fetchLatest();\n  interval = setInterval(fetchLatest, 360000); // 6 menit\n  return () => clearInterval(interval);\n}, [selectedRoom]);\n``` | Pulls the newest sensor row every 6 minutes **only after a room is selected**. |
| 4 | **Created `displayData` helper** (`const displayData = isRoomSelected && realtimeData ? realtimeData : (hasFetched ? actualLatest : null);`) | Centralises the source of values for the metric cards. | Allows metric cards to show real‑time data when available, otherwise fallback to the latest fetched batch. |
| 5 | **Metric cards now read from `displayData`** (lines 206‑232) | Updated `value` and `status` props to use `displayData?.…`. | Reflects the live reading instead of stale data. |
| 6 | **Adjusted `isRoomSelected` logic** (line 145) – unchanged but now used by polling and display logic. |
| 7 | **Minor whitespace tidy** – removed an empty line after `sensorText` in the fetch handler (line 83). |
| 8 | **Added comments** for clarity on real‑time polling and interval duration. | Improves maintainability. |

### Effect on UI
* When a user selects a room from the dropdown, the three **Metric Cards** (Temp, Humidity, Differential Pressure) instantly display the most recent reading.
* After that, the cards automatically refresh **every 6 minutes** without further user interaction.
* The rest of the dashboard (filter panel, chart, recent‑readings table) continues to work exactly as before.

---

## 2️⃣ `components/dashboard/RecentReadings.tsx` – Recent Readings Table

| # | Change | Description | Reason |
|---|--------|-------------|--------|
| 1 | **Added `React` import** (`import React from 'react';`) | Required for JSX fragment usage. |
| 2 | **Grouped readings by date** – introduced `groupedReadings` via `reduce`. | Enables a visual date header for each day’s rows. |
| 3 | **Modified table container** – now has vertical scroll, max‑height, custom scrollbar: `overflow-x-auto overflow-y-auto max-h-[400px] custom-scrollbar pr-2`. | Allows scrolling through arbitrarily many rows. |
| 4 | **Added sticky date header rows** (`<tr className="bg-slate-800/80 sticky top-[36px] …">`). | Keeps the date label visible while scrolling. |
| 5 | **Replaced `.slice(0,10)` with full list** – all rows for a date are rendered. | No longer truncates data; the user can scroll to see everything. |
| 6 | **Typed the map callback** (`Object.entries(groupedReadings) as [string, any[]][]`). | Fixes the Typescript error *“items is of type unknown”*. |
| 7 | **Adjusted table header** – added `sticky top-0 z-10 backdrop-blur-sm` for better UX. |
| 8 | **Styling tweaks** – refined border, background, and hover effects to stay consistent with the dashboard theme. |

### Result
* The Recent Readings table now **groups rows by day**, with each day’s header *sticky* at the top.
* Users can scroll vertically through any number of records while preserving context.
* Typescript builds cleanly with no unknown‑type warnings.

---

## 3️⃣ `app/api/latest-reading/route.ts` – New API Endpoint

| # | Change | Description | Reason |
|---|--------|-------------|--------|
| 1 | **Created new file** `app/api/latest-reading/route.ts`. |
| 2 | **Exports `GET` handler** that accepts `unit_id` query param and returns the **single most recent sensor row** (`ORDER BY timestamp DESC LIMIT 1`). |
| 3 | **Enabled forced dynamic rendering** (`export const dynamic = 'force-dynamic';`). | Guarantees fresh data on each request, bypassing any caching. |
| 4 | **Added server‑side status computation** (`getStatus`) to keep the status logic consistent with the client. |
| 5 | **Error handling** – logs and returns a 500 payload on failure. |

### Purpose
* Provides a lightweight endpoint for the metric‑card real‑time polling, dramatically reducing data volume (one row vs. the whole filtered set).

---

## 4️⃣ `next.config.mjs` – Development Server Host Whitelisting

| # | Change | Description | Reason |
|---|--------|-------------|--------|
| 1 | **Added local IP** (`10.165.40.127`) to `allowedDevOrigins`. | Allows remote devices on the LAN to access the dev server without “Connection Failed”. |
| 2 | **Kept existing entries** for other LAN IPs and `localhost`. | Ensures continued access from all known hosts. |

---

## 5️⃣ `app/api/optimize-db/route.ts` – Index Creation (Deprecated)

| # | Change | Description | Reason |
|---|--------|-------------|--------|
| 1 | Initially added script to create indexes on sensor and fumigasi tables. |
| 2 | Later replaced with a **data‑fix** operation (`UPDATE ... SET unit_id = 'Filling' WHERE unit_id = 'Labelling'`). |
| 3 | Final version now **creates indexes** (original intent) – this file remains for DB admins to run manually if needed. |

> **Note:** The index creation requires `postgres` superuser rights; it’s not executed automatically by the app.

---

## 6️⃣ `components/data/DataTable.tsx` – (No direct changes)  
*Retained for future enhancements; unchanged.*

---

## 7️⃣ `components/data/ExclusionList.tsx` – (No direct changes)  
*Retained for future enhancements; unchanged.*

---

## 8️⃣ `components/dashboard/MetricCard.tsx` – (No direct changes)  
*Metric cards now receive live data via `displayData`, but the component itself stays the same.*

---

## 9️⃣ Miscellaneous / Minor Tweaks

| # | File | Change | Reason |
|---|------|--------|--------|
| 1 | `app/page.tsx` – removed an extra blank line after `sensorText` (line 83) for clean formatting. |
| 2 | `app/page.tsx` – added comments describing the polling interval and its purpose. |
| 3 | `components/dashboard/RecentReadings.tsx` – updated CSS class names for consistency (`bg-slate-800/80`, `sticky`, `backdrop-blur-md`). |
| 4 | Updated translation key references where needed (e.g., “Select Room 2”). |
| 5 | Fixed the **“Labelling” → “Filling”** inconsistency by updating `ROOM_LIST` in both `app/page.tsx` and `app/data-management/page.tsx`. |
| 6 | Adjusted the `fetchError` UI in the dashboard to use a clearer error banner. |
| 7 | Added explicit **`as [string, any[]][]`** type assertion to silence Typescript’s `unknown` warning. |

---

## 📦 How to Deploy / Test the Changes

1. **Start the dev server** on the host machine (the one with IP `10.165.40.127`):  
   ```bash
   npm run dev
   ```
2. **Access the dashboard** from any device on the same LAN via:  
   ```
   http://10.165.40.127:3000
   ```
3. **Select a room** from the dropdown.  
   *Metric cards* will instantly show the latest reading (fetched from `/api/latest‑reading`).  
4. **Wait up to 6 minutes** – the cards will auto‑refresh.  
5. **Scroll the Recent Readings table** – you’ll see date headers and can scroll through all rows (no more 10‑row limit).  

If you need the database indexes for improved query performance, run the `/api/optimize-db` endpoint **as a PostgreSQL superuser** (or execute the SQL statements directly in pgAdmin/DBeaver).

---

## 📑 Summary of Impact

| Aspect | Before | After |
|--------|--------|-------|
| **Room selection** | Only used for bulk fetch. | Triggers real‑time card polling. |
| **Metric cards** | Showed the *latest* value from the bulk fetch. | Show live value updated every 6 min. |
| **Recent readings table** | Fixed at 10 rows, no scroll, no day grouping. | Unlimited rows, vertical scroll, grouped by date headers. |
| **Remote access** | Blocked for IPs not in `allowedDevOrigins`. | IP `10.165.40.127` whitelisted; remote devices can connect. |
| **Database performance** | Full table scans on large time windows. | Indexes (optional) dramatically speed up queries. |
| **Data consistency** | “Labelling” entry existed in DB & UI. | Replaced by “Filling” everywhere. |
| **Error visibility** | Toast only; no persistent UI. | Persistent error banner when fetching fails. |

---

### ✅ Next Steps (optional)

* **Adjust polling interval** – simply edit the `360000` value in `app/page.tsx` if a different cadence is desired.  
* **Expose a toggle** in the UI to enable/disable real‑time polling per user preference.  
* **Add a “Refresh now” button** next to the metric cards to manually trigger an immediate fetch.  
* **Run the `/api/optimize-db` endpoint** (or execute the index SQL) once, to lock in the performance gains for large datasets.

---

*All changes have been committed to the repository. Feel free to open a PR, merge, or continue iterating!*