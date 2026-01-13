import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHotspots } from "../api/adminServices";
import "./AdminDashboard.css";

const HotspotsView = () => {
  const navigate = useNavigate();
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("severity");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchHotspots();
  }, []);

  const fetchHotspots = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHotspots();
      setHotspots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedHotspots = [...hotspots].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "severity") {
      const severityOrder = { High: 2, Medium: 1 };
      aValue = severityOrder[aValue] || 0;
      bValue = severityOrder[bValue] || 0;
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || "";
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  const getSeverityColor = (severity) => {
    if (severity === "High") return "#dc2626";
    if (severity === "Medium") return "#f59e0b";
    return "#64748b";
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Hotspot Monitoring</h1>
            <p className="admin-subtitle">High-risk wards and categories based on complaint volume and priority</p>
          </div>
          <button onClick={() => navigate("/admin")} className="refresh-btn">
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="admin-error-message">
            {error}
          </div>
        )}

        <div className="admin-section">
          {sortedHotspots.length === 0 ? (
            <div className="empty-state">
              <h3>No Hotspots Detected</h3>
              <p>No high-risk areas identified in the last 30 days.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>Category</th>
                    <th
                      className="sortable-header"
                      onClick={() => handleSort("complaintCount")}
                      style={{ cursor: "pointer" }}
                    >
                      Complaint Count {sortField === "complaintCount" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Hotspot Score</th>
                    <th
                      className="sortable-header"
                      onClick={() => handleSort("severity")}
                      style={{ cursor: "pointer" }}
                    >
                      Severity {sortField === "severity" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHotspots.map((hotspot, idx) => (
                    <tr key={idx}>
                      <td className="table-location">{hotspot.ward || "N/A"}</td>
                      <td className="table-category">{hotspot.category || "N/A"}</td>
                      <td>{hotspot.complaintCount || 0}</td>
                      <td>{hotspot.hotspotScore || 0}</td>
                      <td>
                        <span style={{ color: getSeverityColor(hotspot.severity), fontWeight: 500 }}>
                          {hotspot.severity || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotspotsView;
