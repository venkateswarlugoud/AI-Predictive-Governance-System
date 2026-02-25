# GeoLocation Viewing Guide

This guide shows you **where and how to view geoLocation data** in the AI-Predictive-Governance-System.

---

## 📍 Where to View GeoLocation

### 1. **Admin Complaint Detail View** (Recommended)
**Path:** `/admin/complaints/:id`

- Navigate to Admin Dashboard → Click on any complaint
- The geoLocation coordinates are displayed in the "Complaint Details" section
- Shows: **Latitude, Longitude** (formatted as: `12.971600, 77.594600`)

**Example:**
```
Location Coordinates
12.971600, 77.594600
(Lat, Lng)
```

---

### 2. **Geospatial Risk Map** (Visual View)
**Path:** `/admin/map`

- Navigate to Admin Dashboard → Click "Geospatial Risk Map" button
- Complaints with geoLocation appear as:
  - **Heatmap points** (density visualization)
  - **Individual markers** (if implemented)
- You can see the spatial distribution of all complaints

**Features:**
- Heatmap layer shows complaint density
- Ward risk visualization shows risk levels by area
- Time filter: Last 7/30/90 days

---

### 3. **MongoDB Database** (Direct Access)
**Database:** `municipal_governance`  
**Collection:** `complaints`

**Query Examples:**

```javascript
// View all complaints with geoLocation
db.complaints.find({ geoLocation: { $exists: true } })

// View geoLocation field only
db.complaints.find(
  { geoLocation: { $exists: true } },
  { title: 1, geoLocation: 1, ward: 1 }
)

// Find complaints near a location (within 5km)
db.complaints.find({
  geoLocation: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [77.5946, 12.9716] // [lng, lat]
      },
      $maxDistance: 5000 // meters
    }
  }
})

// Count complaints with geoLocation
db.complaints.countDocuments({ geoLocation: { $exists: true } })
```

**Sample Document:**
```json
{
  "_id": ObjectId("..."),
  "title": "Road repair needed",
  "geoLocation": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]  // [longitude, latitude]
  },
  "ward": "W-001",
  ...
}
```

---

### 4. **API Response** (Developer View)

**Endpoint:** `GET /api/complaint/:id`

**Response includes:**
```json
{
  "success": true,
  "complaint": {
    "_id": "...",
    "title": "...",
    "geoLocation": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    ...
  }
}
```

**Test with curl:**
```bash
curl -X GET http://localhost:5000/api/complaint/COMPLAINT_ID \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

### 5. **Browser Developer Console** (Debugging)

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "complaint"
4. Click on the request → Response tab
5. View the JSON response containing `geoLocation`

---

## 🗺️ How to Use GeoLocation Data

### View on External Maps

**Google Maps:**
```
https://www.google.com/maps?q=LATITUDE,LONGITUDE
Example: https://www.google.com/maps?q=12.9716,77.5946
```

**OpenStreetMap:**
```
https://www.openstreetmap.org/?mlat=LATITUDE&mlon=LONGITUDE
Example: https://www.openstreetmap.org/?mlat=12.9716&mlon=77.5946
```

### Format Note
- **Coordinates format:** `[longitude, latitude]` (GeoJSON standard)
- **Display format:** `latitude, longitude` (human-readable)
- **Example:** `[77.5946, 12.9716]` = `12.9716, 77.5946`

---

## 🔍 Checking if GeoLocation Exists

### In Frontend (JavaScript)
```javascript
if (complaint.geoLocation && complaint.geoLocation.coordinates) {
  const [lng, lat] = complaint.geoLocation.coordinates;
  console.log(`Location: ${lat}, ${lng}`);
}
```

### In MongoDB
```javascript
// Complaints WITH geoLocation
db.complaints.find({ geoLocation: { $exists: true, $ne: null } })

// Complaints WITHOUT geoLocation (backward compatible)
db.complaints.find({ geoLocation: { $exists: false } })
```

---

## 📊 Statistics

### Count Complaints by GeoLocation Status
```javascript
// Total complaints
db.complaints.countDocuments({})

// With geoLocation
db.complaints.countDocuments({ geoLocation: { $exists: true } })

// Without geoLocation
db.complaints.countDocuments({ geoLocation: { $exists: false } })
```

---

## 🛠️ Troubleshooting

### If geoLocation is not showing:

1. **Check if complaint was created with geoLocation:**
   - Look at the complaint creation request
   - Verify `geoLocation.coordinates` was sent in the request body

2. **Check MongoDB:**
   ```javascript
   db.complaints.findOne({ _id: ObjectId("COMPLAINT_ID") })
   ```

3. **Check API response:**
   - Use browser DevTools Network tab
   - Verify the response includes `geoLocation` field

4. **Verify coordinates format:**
   - Must be: `[longitude, latitude]` (array of 2 numbers)
   - Longitude: -180 to 180
   - Latitude: -90 to 90

---

## 📝 Example: Creating Complaint with GeoLocation

**Request Body:**
```json
{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing traffic issues",
  "location": "Main Street, Downtown",
  "ward": "W-001",
  "geoLocation": {
    "coordinates": [77.5946, 12.9716]
  }
}
```

**Response:**
```json
{
  "success": true,
  "complaint": {
    "_id": "...",
    "geoLocation": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    ...
  }
}
```

---

## 🎯 Quick Reference

| Location | Path | Shows |
|----------|------|-------|
| Admin Detail View | `/admin/complaints/:id` | Coordinates display |
| Geospatial Map | `/admin/map` | Visual map with heatmap |
| MongoDB | Database query | Raw data |
| API Response | `/api/complaint/:id` | JSON with geoLocation |
| Browser Console | DevTools → Network | Request/Response |

---

**Note:** GeoLocation is **optional**. Complaints created without geoLocation will work fine (backward compatible). Only complaints with valid coordinates will appear on the geospatial map.
