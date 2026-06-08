# Room Form, Dashboard & Report Changes Documentation

This document summarizes all the changes made to the EMS BFS Dashboard, including the Room Addition Form, Dynamic Dashboard Updates, and Report Improvements.

## 1. Overview
The changes include:
- Complete redesign of the Room Addition Form to support multiple attributes per room
- Dynamic room list that fetches from the database instead of using hardcoded values
- Automatic refresh of the dashboard and data management page when new rooms are added
- New API endpoint for fetching all rooms from the database
- Added Comment/Reason column to both valid and excluded data tables in reports

---

## 2. Changes to Room Addition Form (`components/data/RoomForm.tsx`)

### 2.1 Added Attribute Interface
```typescript
interface Attribute {
  id: string;
  name: string;
  externalLogId: string;
  targetColumn: string;
  required: boolean;
  deletable: boolean;
  suffix?: string; // For additional parameters
}
```

### 2.2 Default Attributes
The form initializes with 3 mandatory attributes:
- Temperature (required, non-deletable)
- Relative Humidity (required, non-deletable)
- Differential Pressure 1 (required, non-deletable)

### 2.3 Add Additional Differential Pressure
- Added `addDifferentialPressure()` function to add new DP attributes
- New attributes automatically get a default suffix like " - DP 2"
- New attributes are deletable

### 2.4 Updated Form Layout
Each attribute card includes:
- **ID input**: External log ID (number)
- **Column dropdown**: Select target column (temperature, relative_humidity, differential_pressure)
- **Room Name input (read-only)**: Shows room name (with suffix for additional attributes)
- **Suffix input (only for additional attributes)**: Customize the suffix for additional parameters

### 2.5 Room Name & Unit Display Logic
- **Normal attributes**: Room Name = base room name; `unit_display_name` = base room name
- **Additional attributes**: Room Name = base room name + suffix; `unit_display_name` = base room name + suffix

### 2.6 Added Event Dispatch
When rooms are successfully added, the form dispatches a custom event `ems-room-added` to refresh the dashboard and data management page.

### 2.7 Cleaned Up Unused Fields
Removed the unused `unit` field and validation since we're no longer using a unit dropdown and `unit_display_name` is derived from the room name and suffix.

---

## 3. Changes to Add Room API (`app/api/add-room/route.ts`)
- Updated to accept an array of room entries instead of a single entry
- Added database transaction (BEGIN/COMMIT/ROLLBACK) for data consistency
- Each room entry in the array is inserted into the database
- Returns all inserted rooms in the response

---

## 4. New API: Get All Rooms (`app/api/rooms/route.ts`)
Created a new API endpoint to fetch all distinct room names from the database, ordered alphabetically.

```typescript
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT room_name 
      FROM public."BFS_EMS_Room" 
      ORDER BY room_name ASC
    `;
    const result = await pool.query(query);
    const rooms = result.rows.map((row: any) => row.room_name);
    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error('API Get Rooms Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## 5. Changes to System Dashboard (`app/page.tsx`)
- Replaced hardcoded `ROOM_LIST` with dynamic `roomList` state
- Added `fetchRooms()` function to fetch rooms from the new API
- Added `useEffect` to listen for `ems-room-added` custom events
- Added `useEffect` dependency on `roomList` to refresh polling when rooms change
- Updated KPI calculations and card rendering to use dynamic `roomList`

---

## 6. Changes to Data Management Page (`app/data-management/page.tsx`)
- Replaced hardcoded `ROOM_LIST` with dynamic `roomList` state
- Added `fetchRooms()` function to fetch rooms from the new API
- Added `useEffect` to listen for `ems-room-added` custom events
- Updated room select dropdown to use dynamic `roomList`

---

## 7. Changes to Report Generator (`components/reports/ReportGenerator.tsx`)
### 7.1 Added Comment/Reason Column to Reports
- **MS (Valid) Table**: Comment column uses `comment` field from sensor reading
- **TMS (Excluded) Table**: Comment column uses exclusion `reason` field
- Updated valid/excluded separation to track matching exclusion reason for excluded readings
- Added "Comment/Reason" column to both tables in the PDF

---

## 8. Build Status
All changes have been tested and the build passes successfully!

---

## 9. Usage Example
1. Navigate to Data Management page
2. Fill in Room Name: "Transfer Plastic Moulding"
3. Fill in IDs for Temperature, RH, and DP 1
4. (Optional) Click "Add Another Differential Pressure" to add DP 2, DP 3, etc.
5. For additional DPs, customize the suffix if needed (default: " - DP 2")
6. Select Line and Status
7. Click "Add Room"
8. The new room will automatically appear on the System Dashboard and Data Management room list!
9. When generating reports, excluded data will now show the exclusion reason in the new column!
