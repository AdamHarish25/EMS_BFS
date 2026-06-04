# Room Form Changes Documentation

This document summarizes the changes made to the Room Addition Form in the EMS BFS Dashboard.

## 1. Overview
The Room Addition Form was redesigned to:
- Support 3 mandatory attributes (Temperature, Relative Humidity, Differential Pressure 1) by default
- Allow adding additional Differential Pressure attributes
- Automatically handle room names with suffixes for additional attributes
- Replace the unit dropdown with a read-only room name input that follows the room name
- Add Line and Status dropdowns (with Aktif/Non-aktif options)

## 2. Changes to `components/data/RoomForm.tsx`

### 2.1 Added Attribute Interface
```typescript
interface Attribute {
  id: string;
  name: string;
  externalLogId: string;
  targetColumn: string;
  unit: string;
  required: boolean;
  deletable: boolean;
  suffix?: string; // For additional DPs
}
```

### 2.2 Default Attributes
The form now initializes with 3 mandatory attributes:
- Temperature (required, non-deletable)
- Relative Humidity (required, non-deletable)
- Differential Pressure 1 (required, non-deletable)

### 2.3 Add Additional Differential Pressure
- Added `addDifferentialPressure()` function to add new DP attributes
- New attributes automatically get a default suffix like " - DP 2"
- New attributes are deletable

### 2.4 Updated Form Layout
The attribute cards now have:
- **ID input**: External log ID (number)
- **Column dropdown**: Select target column (temperature, relative_humidity, differential_pressure)
- **Room Name input (read-only)**: Shows room name (with suffix for additional attributes)
- **Suffix input (only for additional attributes)**: Customize the suffix for additional DPs

### 2.5 Room Name and Unit Display Name Logic
- **Normal attributes**: Room Name = base room name; unit_display_name = base room name
- **Additional attributes**: Room Name = base room name + suffix + " - " + attribute name; unit_display_name = same as Room Name

## 3. Changes to `app/api/add-room/route.ts`
- Updated to accept an array of room entries instead of a single entry
- Added database transaction (BEGIN/COMMIT/ROLLBACK) to ensure data consistency
- Each room entry in the array is inserted into the database
- Returns all inserted rooms in the response

## 4. Build Status
All changes have been tested and the build passes successfully!

## 5. Usage Example
1. Enter room name: "Transfer Plastic Moulding"
2. Fill in IDs for Temperature, RH, and DP 1
3. (Optional) Click "Add Another Differential Pressure" to add DP 2, DP 3, etc.
4. For additional DPs, customize the suffix if needed (default: " - DP 2")
5. Select Line and Status
6. Click "Add Room" to submit
