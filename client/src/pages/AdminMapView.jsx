import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { getHeatmapData, getWardRiskData, getAllAlerts } from "../api/adminServices";

// Import wards GeoJSON - adjust path if needed
// Note: In production, this should be loaded from a public URL or API endpoint
const wardsGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { ward: "Ward-1" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.5, 12.9], [77.6, 12.9], [77.6, 13.0], [77.5, 13.0], [77.5, 12.9]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-2" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.6, 12.9], [77.7, 12.9], [77.7, 13.0], [77.6, 13.0], [77.6, 12.9]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-3" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.5, 13.0], [77.6, 13.0], [77.6, 13.1], [77.5, 13.1], [77.5, 13.0]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-4" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.6, 13.0], [77.7, 13.0], [77.7, 13.1], [77.6, 13.1], [77.6, 13.0]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-5" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.5, 12.8], [77.6, 12.8], [77.6, 12.9], [77.5, 12.9], [77.5, 12.8]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-6" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.6, 12.8], [77.7, 12.8], [77.7, 12.9], [77.6, 12.9], [77.6, 12.8]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-7" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.7, 12.9], [77.8, 12.9], [77.8, 13.0], [77.7, 13.0], [77.7, 12.9]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-8" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.7, 13.0], [77.8, 13.0], [77.8, 13.1], [77.7, 13.1], [77.7, 13.0]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-9" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.5, 13.1], [77.6, 13.1], [77.6, 13.2], [77.5, 13.2], [77.5, 13.1]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-10" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.6, 13.1], [77.7, 13.1], [77.7, 13.2], [77.6, 13.2], [77.6, 13.1]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-11" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.7, 13.1], [77.8, 13.1], [77.8, 13.2], [77.7, 13.2], [77.7, 13.1]]],
      },
    },
    {
      type: "Feature",
      properties: { ward: "Ward-12" },
      geometry: {
        type: "Polygon",
        coordinates: [[[77.4, 12.9], [77.5, 12.9], [77.5, 13.0], [77.4, 13.0], [77.4, 12.9]]],
      },
    },
  ],
};

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/**
 * Heatmap Layer Component
 * Renders heatmap using leaflet.heat plugin
 */
const HeatmapLayer = ({ data, enabled }) => {
  const map = useMap();

  useEffect(() => {
    // Always clean up any existing heat layers when toggling or data changes
    // to avoid stale layers lingering on the map.
    let heatLayer;

    if (enabled && data && data.length > 0) {
      // Convert data to leaflet.heat format: [lat, lng, intensity]
      const heatData = data.map((point) => [
        Number(point.lat),
        Number(point.lng),
        Number(point.weight || point.count || 1),
      ]);

      // Defensive guard: if conversion fails, don't break the map
      if (heatData.every((d) => !Number.isNaN(d[0]) && !Number.isNaN(d[1]) && !Number.isNaN(d[2]))) {
        const maxIntensity = Math.max(...heatData.map((d) => d[2]), 1);

        heatLayer = L.heatLayer(heatData, {
          radius: 30,
          blur: 18,
          maxZoom: 18,
          max: maxIntensity,
          gradient: {
            0.0: "blue",
            0.2: "cyan",
            0.4: "lime",
            0.6: "yellow",
            0.8: "orange",
            1.0: "red",
          },
        });

        heatLayer.addTo(map);
        if (heatLayer.bringToFront) {
          heatLayer.bringToFront();
        }
      }
    }

    return () => {
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, data, enabled]);

  return null;
};

/**
 * Heatmap Center Markers (optional visual aid)
 * Draws a small marker at the center of each aggregated heat cell so that
 * officers can better see the exact grid point represented by the heat blob.
 */
const HeatmapCenterMarkers = ({ data, enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !data || data.length === 0) {
      return undefined;
    }

    const group = L.layerGroup();

    data.forEach((point) => {
      const lat = Number(point.lat);
      const lng = Number(point.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      L.circleMarker([lat, lng], {
        radius: 4,
        color: "#0f172a",
        weight: 1,
        fillColor: "#ffffff",
        fillOpacity: 0.9,
      }).addTo(group);
    });

    group.addTo(map);

    return () => {
      map.removeLayer(group);
    };
  }, [map, data, enabled]);

  return null;
};

/**
 * Map viewport manager
 * Automatically fits the map to available heatmap points so that the
 * default view is focused on the city data instead of a generic center.
 */
const MapViewportManager = ({ heatmapData }) => {
  const map = useMap();

  useEffect(() => {
    if (!heatmapData || heatmapData.length === 0) return;

    const latLngs = heatmapData
      .map((point) => [Number(point.lat), Number(point.lng)])
      .filter(([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng));

    if (latLngs.length === 0) return;

    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds.pad(0.25)); // add a bit of padding around the cluster
  }, [map, heatmapData]);

  return null;
};
/**
 * Ward Risk Layer Component
 * Colors wards based on risk severity
 */
const WardRiskLayer = ({ wardRiskData, enabled }) => {
  const map = useMap();

  const getWardColor = useCallback((ward) => {
    const wardData = wardRiskData.find((w) => w.ward === ward);
    if (!wardData) return "#808080"; // Gray for unknown

    switch (wardData.severity) {
      case "High":
        return "#dc2626"; // Red
      case "Medium":
        return "#eab308"; // Yellow
      case "Low":
        return "#22c55e"; // Green
      default:
        return "#808080";
    }
  }, [wardRiskData]);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const ward = feature.properties.ward;
      const wardData = wardRiskData.find((w) => w.ward === ward);

      if (wardData) {
        layer.bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-lg mb-2">${ward}</h3>
            <p><strong>Risk Score:</strong> ${wardData.riskScore}</p>
            <p><strong>Severity:</strong> ${wardData.severity}</p>
            <p><strong>Categories:</strong> ${wardData.categoryCount || 0}</p>
          </div>
        `);
      }

      // Style the feature
      layer.setStyle({
        fillColor: getWardColor(ward),
        fillOpacity: 0.6,
        color: "#333",
        weight: 2,
      });

      // Hover effects
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            fillOpacity: 0.8,
            weight: 3,
          });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle({
            fillOpacity: 0.6,
            weight: 2,
          });
        },
      });
    },
    [wardRiskData, getWardColor]
  );

  if (!enabled || !wardRiskData || wardRiskData.length === 0) {
    return null;
  }

  return <GeoJSON data={wardsGeoJSON} onEachFeature={onEachFeature} />;
};

/**
 * Alert Markers Component
 * Shows severe alerts on the map
 */
const AlertMarkers = ({ alerts, enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !alerts || alerts.length === 0) {
      return;
    }

    const markers = [];
    const severeAlerts = alerts.filter(
      (alert) => alert.severity === "Severe" && alert.status === "Open"
    );

    severeAlerts.forEach((alert) => {
      // Note: This is a simplified implementation
      // In production, you'd need ward coordinates mapping
      // For now, we'll skip marker rendering if coordinates aren't available
      // This can be enhanced with a ward-to-coordinates mapping service
    });

    return () => {
      markers.forEach((marker) => map.removeLayer(marker));
    };
  }, [map, alerts, enabled]);

  return null;
};

/**
 * Debounce hook for API calls
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Admin Map View Component
 * Geospatial Risk Visualization Dashboard
 */
const AdminMapView = () => {
  // Default city coordinates (adjust based on your city)
  const DEFAULT_CENTER = [12.9716, 77.5946]; // Example: Bangalore, India
  const DEFAULT_ZOOM = 12;

  // State management
  const [heatmapData, setHeatmapData] = useState([]);
  const [wardRiskData, setWardRiskData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and layer states
  const [timeFilter, setTimeFilter] = useState("last30");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWardRisk, setShowWardRisk] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  // Debounce time filter for API calls
  const debouncedTimeFilter = useDebounce(timeFilter, 500);

  // Fetch heatmap data
  const fetchHeatmapData = useCallback(async () => {
    try {
      const response = await getHeatmapData(debouncedTimeFilter);
      if (response.success && response.data) {
        setHeatmapData(response.data);
      }
    } catch (err) {
      console.error("Error fetching heatmap data:", err);
      setError(err.message);
    }
  }, [debouncedTimeFilter]);

  // Fetch ward risk data
  const fetchWardRiskData = useCallback(async () => {
    try {
      const response = await getWardRiskData();
      if (response.success && response.data) {
        setWardRiskData(response.data);
      }
    } catch (err) {
      console.error("Error fetching ward risk data:", err);
      setError(err.message);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const alertsData = await getAllAlerts();
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setError(err.message);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchHeatmapData(),
          fetchWardRiskData(),
          fetchAlerts(),
        ]);
      } catch (err) {
        setError(err.message || "Failed to load map data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // Only on mount

  // Refetch heatmap when time filter changes (debounced)
  useEffect(() => {
    if (!loading) {
      fetchHeatmapData();
    }
  }, [debouncedTimeFilter, fetchHeatmapData, loading]);

  // Memoized map content
  const mapContent = useMemo(
    () => (
      <>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer data={heatmapData} enabled={showHeatmap} />
        <HeatmapCenterMarkers data={heatmapData} enabled={showHeatmap} />
        <WardRiskLayer wardRiskData={wardRiskData} enabled={showWardRisk} />
        <AlertMarkers alerts={alerts} enabled={showAlerts} />
      </>
    ),
    [heatmapData, wardRiskData, alerts, showHeatmap, showWardRisk, showAlerts]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Geospatial Risk Map
          </h1>
          <p className="text-gray-600">
            Visualize complaint hotspots, ward risk levels, and governance alerts
          </p>
        </div>

        {/* Controls Panel */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div
            className="flex flex-col gap-4 md:flex-row md:items-center"
            style={{ alignItems: "flex-start" }}
          >
            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Time Period:
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
              </select>
            </div>

            {/* Layer Toggles */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Layers:</span>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>Heatmap</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showWardRisk}
                  onChange={(e) => setShowWardRisk(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>Ward Risk</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showAlerts}
                  onChange={(e) => setShowAlerts(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>Alerts</span>
              </label>
            </div>

            {/* Legend - explains ward colors only, non-interactive */}
            <div
              className="md:ml-auto flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-700"
              style={{ marginLeft: "auto" }}
            >
              <span className="font-medium text-gray-600">Ward risk legend:</span>
              <div className="flex items-center gap-1">
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    borderRadius: 9999,
                    backgroundColor: "#22c55e",
                    border: "1px solid #16a34a",
                  }}
                />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    borderRadius: 9999,
                    backgroundColor: "#eab308",
                    border: "1px solid #ca8a04",
                  }}
                />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    borderRadius: 9999,
                    backgroundColor: "#dc2626",
                    border: "1px solid #b91c1c",
                  }}
                />
                <span>High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-red-600 text-lg font-semibold mb-2">Error</p>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: "560px", width: "100%" }}
              scrollWheelZoom={true}
            >
              <MapViewportManager heatmapData={heatmapData} />
              {mapContent}
            </MapContainer>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Heatmap Points</h3>
            <p className="text-2xl font-bold text-gray-800">{heatmapData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">At-Risk Wards</h3>
            <p className="text-2xl font-bold text-gray-800">{wardRiskData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Severe Alerts</h3>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter((a) => a.severity === "Severe" && a.status === "Open").length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapView;
