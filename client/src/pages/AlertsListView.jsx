import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllAlerts } from "../api/adminServices";
import "./AdminDashboard.css";

const AlertsListView = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatAlertType = (alertType) => {
    if (alertType === "HOTSPOT_ALERT") return "Hotspot Alert";
    if (alertType === "SPIKE_ALERT") return "Spike Alert";
    return alertType || "N/A";
  };

  const getSeverityColor = (severity) => {
    if (severity === "High" || severity === "Severe") return "#dc2626";
    if (severity === "Medium" || severity === "Moderate") return "#f59e0b";
    return "#64748b";
  };

  const getStatusColor = (status) => {
    if (status === "Open") return "#dc2626";
    if (status === "Acknowledged") return "#f59e0b";
    if (status === "Resolved") return "#10b981";
    return "#64748b";
  };

  // Group alerts by status
  const groupedAlerts = {
    Open: alerts.filter((a) => a.status === "Open"),
    Acknowledged: alerts.filter((a) => a.status === "Acknowledged"),
    Resolved: alerts.filter((a) => a.status === "Resolved"),
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
            <h1 className="admin-title">Governance Alerts</h1>
            <p className="admin-subtitle">Formal alerts for municipal authority review</p>
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
          {alerts.length === 0 ? (
            <div className="empty-state">
              <h3>No Alerts</h3>
              <p>No governance alerts have been generated.</p>
            </div>
          ) : (
            <>
              {/* Open Alerts */}
              {groupedAlerts.Open.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <h3 className="subsection-title" style={{ color: "#dc2626", marginBottom: "16px" }}>
                    Open ({groupedAlerts.Open.length})
                  </h3>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Alert Type</th>
                          <th>Ward</th>
                          <th>Category</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>Created Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedAlerts.Open.map((alert) => (
                          <tr
                            key={alert._id}
                            onClick={() => navigate(`/admin/alerts/${alert._id}`)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>{formatAlertType(alert.alertType)}</td>
                            <td className="table-location">{alert.ward || "N/A"}</td>
                            <td className="table-category">{alert.category || "N/A"}</td>
                            <td>
                              <span style={{ color: getSeverityColor(alert.severity), fontWeight: 500 }}>
                                {alert.severity || "N/A"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: getStatusColor(alert.status), fontWeight: 500 }}>
                                {alert.status || "N/A"}
                              </span>
                            </td>
                            <td className="table-date">{formatDate(alert.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Acknowledged Alerts */}
              {groupedAlerts.Acknowledged.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <h3 className="subsection-title" style={{ color: "#f59e0b", marginBottom: "16px" }}>
                    Acknowledged ({groupedAlerts.Acknowledged.length})
                  </h3>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Alert Type</th>
                          <th>Ward</th>
                          <th>Category</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>Created Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedAlerts.Acknowledged.map((alert) => (
                          <tr
                            key={alert._id}
                            onClick={() => navigate(`/admin/alerts/${alert._id}`)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>{formatAlertType(alert.alertType)}</td>
                            <td className="table-location">{alert.ward || "N/A"}</td>
                            <td className="table-category">{alert.category || "N/A"}</td>
                            <td>
                              <span style={{ color: getSeverityColor(alert.severity), fontWeight: 500 }}>
                                {alert.severity || "N/A"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: getStatusColor(alert.status), fontWeight: 500 }}>
                                {alert.status || "N/A"}
                              </span>
                            </td>
                            <td className="table-date">{formatDate(alert.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resolved Alerts */}
              {groupedAlerts.Resolved.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <h3 className="subsection-title" style={{ color: "#10b981", marginBottom: "16px" }}>
                    Resolved ({groupedAlerts.Resolved.length})
                  </h3>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Alert Type</th>
                          <th>Ward</th>
                          <th>Category</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>Created Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedAlerts.Resolved.map((alert) => (
                          <tr
                            key={alert._id}
                            onClick={() => navigate(`/admin/alerts/${alert._id}`)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>{formatAlertType(alert.alertType)}</td>
                            <td className="table-location">{alert.ward || "N/A"}</td>
                            <td className="table-category">{alert.category || "N/A"}</td>
                            <td>
                              <span style={{ color: getSeverityColor(alert.severity), fontWeight: 500 }}>
                                {alert.severity || "N/A"}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: getStatusColor(alert.status), fontWeight: 500 }}>
                                {alert.status || "N/A"}
                              </span>
                            </td>
                            <td className="table-date">{formatDate(alert.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsListView;
