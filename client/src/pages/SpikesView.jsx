import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpikes } from "../api/adminServices";
import "./AdminDashboard.css";

const SpikesView = () => {
  const navigate = useNavigate();
  const [spikes, setSpikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("spikeRatio");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchSpikes();
  }, []);

  const fetchSpikes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSpikes();
      setSpikes(data);
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

  const sortedSpikes = [...spikes].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "severity") {
      const severityOrder = { Severe: 2, Moderate: 1 };
      aValue = severityOrder[aValue] || 0;
      bValue = severityOrder[bValue] || 0;
    } else if (typeof aValue === "number") {
      // Numeric comparison
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

  const formatSpikeRatio = (ratio) => {
    if (ratio === null || ratio === undefined) return "0.00";
    return Number(ratio).toFixed(2);
  };

  const getSeverityColor = (severity) => {
    if (severity === "Severe") return "#dc2626";
    if (severity === "Moderate") return "#f59e0b";
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
            <h1 className="admin-title">Spike Detection</h1>
            <p className="admin-subtitle">Sudden increases compared to historical baseline</p>
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
          {sortedSpikes.length === 0 ? (
            <div className="empty-state">
              <h3>No Spikes Detected</h3>
              <p>No abnormal increases in complaint volume detected in the current week.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>Category</th>
                    <th>Baseline Weekly Avg</th>
                    <th>Current Week Count</th>
                    <th>Spike Ratio</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSpikes.map((spike, idx) => (
                    <tr key={idx}>
                      <td className="table-location">{spike.ward || "N/A"}</td>
                      <td className="table-category">{spike.category || "N/A"}</td>
                      <td>{spike.baselineWeeklyAvg?.toFixed(1) || "0.0"}</td>
                      <td>{spike.currentWeekCount || 0}</td>
                      <td>{formatSpikeRatio(spike.spikeRatio)}</td>
                      <td>
                        <span style={{ color: getSeverityColor(spike.severity), fontWeight: 500 }}>
                          {spike.severity || "N/A"}
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

export default SpikesView;
