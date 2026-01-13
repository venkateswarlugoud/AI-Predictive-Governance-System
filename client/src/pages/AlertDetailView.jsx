import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAllAlerts, acknowledgeAlert, resolveAlert } from "../api/adminServices";
import "./AdminDashboard.css";

const AlertDetailView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    fetchAlert();
  }, [id]);

  const fetchAlert = async () => {
    try {
      setLoading(true);
      setError(null);
      const alerts = await getAllAlerts();
      const foundAlert = alerts.find((a) => a._id === id);
      if (foundAlert) {
        setAlert(foundAlert);
      } else {
        setError("Alert not found");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      setMessage("");
      const updatedAlert = await acknowledgeAlert(id);
      setAlert(updatedAlert);
      setMessage("Alert acknowledged successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNote.trim()) {
      setError("Resolution note is required");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setMessage("");
      const updatedAlert = await resolveAlert(id, resolutionNote);
      setAlert(updatedAlert);
      setResolutionNote("");
      setMessage("Alert resolved successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
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

  if (error && !alert) {
    return (
      <div className="page-container">
        <div className="container">
          <div className="admin-header">
            <div>
              <h1 className="admin-title">Alert Detail</h1>
            </div>
            <button onClick={() => navigate("/admin/alerts")} className="refresh-btn">
              ← Back to Alerts
            </button>
          </div>
          <div className="admin-error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!alert) {
    return null;
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Alert Detail</h1>
            <p className="admin-subtitle">Review and manage governance alert</p>
          </div>
          <button onClick={() => navigate("/admin/alerts")} className="refresh-btn">
            ← Back to Alerts
          </button>
        </div>

        {error && (
          <div className="admin-error-message">
            {error}
          </div>
        )}

        {message && (
          <div className="admin-success-message">
            {message}
          </div>
        )}

        <div className="admin-section">
          {/* Alert Summary */}
          <div style={{ marginBottom: "32px", padding: "24px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
            <h3 className="subsection-title" style={{ marginBottom: "20px" }}>Alert Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Alert Type</div>
                <div style={{ fontSize: "16px", fontWeight: 500 }}>{formatAlertType(alert.alertType)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Ward</div>
                <div style={{ fontSize: "16px", fontWeight: 500 }}>{alert.ward || "N/A"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Category</div>
                <div style={{ fontSize: "16px", fontWeight: 500 }}>{alert.category || "N/A"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Severity</div>
                <div style={{ fontSize: "16px", fontWeight: 500, color: getSeverityColor(alert.severity) }}>
                  {alert.severity || "N/A"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Status</div>
                <div style={{ fontSize: "16px", fontWeight: 500, color: getStatusColor(alert.status) }}>
                  {alert.status || "N/A"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Reference Score</div>
                <div style={{ fontSize: "16px", fontWeight: 500 }}>{alert.referenceScore || "N/A"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Created Date</div>
                <div style={{ fontSize: "16px", fontWeight: 500 }}>{formatDate(alert.createdAt)}</div>
              </div>
              {alert.acknowledgedAt && (
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Acknowledged At</div>
                  <div style={{ fontSize: "16px", fontWeight: 500 }}>{formatDate(alert.acknowledgedAt)}</div>
                </div>
              )}
              {alert.resolvedAt && (
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Resolved At</div>
                  <div style={{ fontSize: "16px", fontWeight: 500 }}>{formatDate(alert.resolvedAt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Alert Description */}
          <div style={{ marginBottom: "32px" }}>
            <h3 className="subsection-title" style={{ marginBottom: "12px" }}>Alert Description</h3>
            <div style={{ padding: "16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "15px", lineHeight: "1.6", color: "#334155" }}>
              {alert.description || "No description available."}
            </div>
          </div>

          {/* Resolution Note (if resolved) */}
          {alert.resolutionNote && (
            <div style={{ marginBottom: "32px" }}>
              <h3 className="subsection-title" style={{ marginBottom: "12px" }}>Resolution Note</h3>
              <div style={{ padding: "16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "15px", lineHeight: "1.6", color: "#334155" }}>
                {alert.resolutionNote}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "2px solid #e2e8f0" }}>
            <h3 className="subsection-title" style={{ marginBottom: "16px" }}>Actions</h3>
            
            {alert.status === "Open" && (
              <div>
                <button
                  onClick={handleAcknowledge}
                  disabled={actionLoading}
                  className="refresh-btn"
                  style={{ minWidth: "200px" }}
                >
                  {actionLoading ? "Processing..." : "Acknowledge Alert"}
                </button>
              </div>
            )}

            {alert.status === "Acknowledged" && (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "8px", color: "#334155" }}>
                    Resolution Note <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Enter official remarks explaining the resolution action..."
                    rows={5}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Resolution note is required for formal closure and audit trail.
                  </div>
                </div>
                <button
                  onClick={handleResolve}
                  disabled={actionLoading || !resolutionNote.trim()}
                  className="refresh-btn"
                  style={{
                    minWidth: "200px",
                    opacity: !resolutionNote.trim() ? 0.5 : 1,
                    cursor: !resolutionNote.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? "Processing..." : "Mark as Resolved"}
                </button>
              </div>
            )}

            {alert.status === "Resolved" && (
              <div style={{ padding: "16px", backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "4px", color: "#166534" }}>
                This alert has been resolved. No further actions available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailView;
