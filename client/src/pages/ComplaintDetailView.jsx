import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AIPredictionTimeline from "../components/AIPredictionTimeline";
import "./AdminDashboard.css";

const ComplaintDetailView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Repeat Pattern Analysis State
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisTriggered, setAnalysisTriggered] = useState(false);

  // Escalation Indicator (Advisory) State
  const [escalationInfo, setEscalationInfo] = useState(null);
  const [escalationError, setEscalationError] = useState(null);
  
  // Collapsible section state
  const [isAdvisoryExpanded, setIsAdvisoryExpanded] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [finalCategoryInput, setFinalCategoryInput] = useState("");
  const [finalPriorityInput, setFinalPriorityInput] = useState("");
  const [overrideReasonInput, setOverrideReasonInput] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState(null);

  const isOverrideValid =
    overrideReasonInput.trim().length > 0 &&
    (finalCategoryInput !== "" || finalPriorityInput !== "");

  useEffect(() => {
    setAnalysisTriggered(false);
    setAnalysisResult(null);
    setAnalysisError(null);
    setEscalationInfo(null);
    setEscalationError(null);
    setIsAdvisoryExpanded(false);
    fetchComplaint();
  }, [id]);

  // Automatically run analysis when complaint is loaded and status is Resolved
  useEffect(() => {
    if (complaint && complaint.description && complaint.status === "Resolved" && !analysisTriggered) {
      setAnalysisTriggered(true);
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint]);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await API.get(`/complaint/${id}`);
      if (response.data.success && response.data.complaint) {
        setComplaint(response.data.complaint);
      } else if (response.data.complaint) {
        setComplaint(response.data.complaint);
      } else {
        setError("Complaint not found");
      }

      // Fetch escalation indicator (advisory, read-only)
      try {
        const escalationRes = await API.get(`/escalation/by-complaint/${id}`);
        if (escalationRes.data && escalationRes.data.success) {
          setEscalationInfo(escalationRes.data);
        } else {
          setEscalationInfo(null);
        }
      } catch (escError) {
        console.error("Error fetching escalation indicator:", escError);
        setEscalationInfo(null);
        setEscalationError(
          escError.response?.data?.message ||
            "Escalation indicator is temporarily unavailable. Officers may proceed with standard review."
        );
      }
    } catch (err) {
      console.error("Error fetching complaint:", err);
      setError(err.response?.data?.message || err.message || "Failed to load complaint");
    } finally {
      setLoading(false);
    }
  };


  const runAnalysis = async () => {
    if (!complaint || !complaint.description) {
      return;
    }

    try {
      setAnalysisLoading(true);
      setAnalysisError(null);
      setAnalysisResult(null);

      const response = await API.post("/embeddings/repeat-check", {
        description: complaint.description,
        title: complaint.title || null, // Include title for comprehensive semantic matching
        ward: complaint.ward || null,
        category: complaint.category || null,
        complaintId: complaint._id || null, // Prevent self-matching
      });

      if (response.data.success) {
        setAnalysisResult(response.data);
      } else {
        setAnalysisError(response.data.message || "Analysis failed");
      }
    } catch (err) {
      console.error("Error running analysis:", err);
      // Silently handle errors - don't show error if analysis fails
      setAnalysisError(null);
    } finally {
      setAnalysisLoading(false);
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

  const getStatusBadge = (status) => {
    const statusMap = {
      New: "badge-new",
      Pending: "badge-new",
      "In Progress": "badge-in-progress",
      Resolved: "badge-resolved",
    };
    return statusMap[status] || "badge-new";
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      High: "badge-priority-high",
      Medium: "badge-priority-medium",
      Low: "badge-priority-low",
    };
    return priorityMap[priority] || "badge-priority-low";
  };

  const getEscalationBadgeClass = (level) => {
    if (level === "High Risk") return "badge-escalation-high";
    if (level === "Attention Required") return "badge-escalation-attention";
    if (level === "Delayed (Low Impact)") return "badge-escalation-delayed";
    return "badge-escalation-normal";
  };

  const formatRemainingHours = (hours) => {
    if (hours === null || hours === undefined) return "N/A";
    if (hours <= 0) return "0 hours";
    if (hours < 1) {
      return `${(hours * 60).toFixed(0)} minutes`;
    }
    if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    }
    const days = Math.floor(hours / 24);
    const remaining = hours % 24;
    if (days > 0 && remaining >= 1) {
      return `${days} day${days > 1 ? "s" : ""} ${remaining.toFixed(1)} hours`;
    }
    return `${days} day${days > 1 ? "s" : ""}`;
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!isOverrideValid || overrideSubmitting) return;

    try {
      setOverrideSubmitting(true);
      setOverrideError(null);

      const payload = {
        overrideReason: overrideReasonInput.trim(),
      };
      if (finalCategoryInput) {
        payload.finalCategory = finalCategoryInput;
      }
      if (finalPriorityInput) {
        payload.finalPriority = finalPriorityInput;
      }

      await API.put(`/complaint/${id}/override`, payload);

      showToast({
        type: "success",
        message: "Final decision overridden successfully.",
      });
      setShowOverrideForm(false);
      setFinalCategoryInput("");
      setFinalPriorityInput("");
      setOverrideReasonInput("");
      await fetchComplaint();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to submit override.";
      setOverrideError(msg);
      showToast({
        type: "error",
        message: msg,
      });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleOverrideCancel = () => {
    setShowOverrideForm(false);
    setOverrideError(null);
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

  if (error && !complaint) {
    return (
      <div className="page-container">
        <div className="container">
          <div className="admin-header">
            <div>
              <h1 className="admin-title">Complaint Detail</h1>
            </div>
            <button onClick={() => navigate("/admin")} className="refresh-btn">
              ← Back to Dashboard
            </button>
          </div>
          <div className="admin-error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  const showAdvisorySection = complaint.status === "Resolved";
  const finalCategory = complaint.finalCategory || complaint.category || null;
  const finalPriority = complaint.finalPriority || complaint.priority || null;
  const isCategoryOverridden =
    complaint.finalCategory &&
    complaint.category &&
    complaint.finalCategory !== complaint.category;
  const hasOverrideAudit = !!complaint.decisionAudit?.decidedBy;
  const decidedByName = complaint.decisionAudit?.decidedBy?.name || "Officer";
  const decidedAtFormatted = complaint.decisionAudit?.decidedAt
    ? new Date(complaint.decisionAudit.decidedAt).toLocaleString()
    : "N/A";
  const overrideReason = complaint.decisionAudit?.overrideReason || "No reason provided";
  const canOverride = user?.role === "admin" && complaint.status !== "Resolved";

  return (
    <div className="page-container">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Complaint Review</h1>
            <p className="admin-subtitle">Review complaint details and advisory indicators</p>
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

        {/* Escalation (governance alert only when SLA Breached) */}
        <div className="admin-section" style={{ marginBottom: "24px" }}>
          <h3 className="subsection-title" style={{ marginBottom: "12px" }}>
            Escalation
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px", maxWidth: "760px" }}>
            Governance alert to assist administrators. Shown only when SLA is breached. Does not override status, change priority, or trigger automation.
          </p>

          {escalationError && (
            <div className="admin-error-message" style={{ marginBottom: "16px" }}>
              {escalationError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.8fr)",
              gap: "20px",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Indicator</div>
              <div>
                {escalationInfo?.escalationLevel != null ? (
                  <span
                    className={`badge badge-escalation-sm ${getEscalationBadgeClass(escalationInfo.escalationLevel)}`}
                    title="Governance alert to assist administrators."
                  >
                    {escalationInfo.escalationLevel}
                  </span>
                ) : (
                  <span className="table-date">No governance alert</span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Contributing Factors</div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>
                <li>
                  <strong>SLA status:</strong>{" "}
                  {escalationInfo?.slaStatus ?? complaint.slaStatus ?? "On Track"}
                </li>
                <li>
                  <strong>Priority:</strong> {escalationInfo?.priority ?? complaint.priority ?? "Medium"}
                </li>
                <li>
                  <strong>Repeat pattern:</strong>{" "}
                  {escalationInfo?.repeatPattern && escalationInfo.repeatPattern.strength !== "None"
                    ? escalationInfo.repeatPattern.strength === "Strong"
                      ? "Strong historical repeat pattern for this ward and category"
                      : "Some historical repeat pattern for this ward and category"
                    : "No clear historical repeat pattern detected"}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="admin-section">
          {/* Complaint Details - Primary Section */}
          <div style={{ marginBottom: "32px" }}>
            <h3 className="subsection-title" style={{ marginBottom: "20px" }}>Complaint Details</h3>
            <div style={{ padding: "24px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Title</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.title || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Category</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {finalCategory || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Ward</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.ward || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Location (Text)</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.location || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Priority</div>
                  <div>
                    <span className={`badge ${getPriorityBadge(finalPriority)}`}>
                      {finalPriority || "N/A"}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Status</div>
                  <div>
                    <span className={`badge ${getStatusBadge(complaint.status)}`}>
                      {complaint.status || "New"}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>SLA Status (Advisory)</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.slaStatus || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>SLA Deadline</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.slaDeadline ? formatDate(complaint.slaDeadline) : "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Remaining Time</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {formatRemainingHours(complaint.slaRemainingHours)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Created Date</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {formatDate(complaint.createdAt)}
                  </div>
                </div>
                {complaint.geoLocation && complaint.geoLocation.coordinates && (
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Location Coordinates</div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#334155", fontFamily: "monospace" }}>
                      {complaint.geoLocation.coordinates[1].toFixed(6)}, {complaint.geoLocation.coordinates[0].toFixed(6)}
                      <br />
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        (Lat, Lng)
                      </span>
                      <br />
                      <a
                        href={`https://www.google.com/maps?q=${complaint.geoLocation.coordinates[1]},${complaint.geoLocation.coordinates[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "12px",
                          color: "#3b82f6",
                          textDecoration: "underline",
                          marginTop: "4px",
                          display: "inline-block"
                        }}
                      >
                        View on Google Maps →
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>Description</div>
                <div style={{ 
                  padding: "16px", 
                  backgroundColor: "#ffffff", 
                  border: "1px solid #e2e8f0", 
                  borderRadius: "4px", 
                  fontSize: "15px", 
                  lineHeight: "1.6", 
                  color: "#334155",
                  whiteSpace: "pre-wrap"
                }}>
                  {complaint.description || "No description provided"}
                </div>
              </div>
            </div>
          </div>

          {/* AI Advisory - separate section */}
          <div style={{ marginBottom: "32px" }}>
            <h3 className="subsection-title" style={{ marginBottom: "20px" }}>
              AI Advisory
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
              Model suggestion only. Not the official decision.
            </p>
            <div
              style={{
                padding: "24px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Category</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.category || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Priority</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.priority || "N/A"}
                  </div>
                </div>
                {complaint.categoryConfidence != null && (
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Category Confidence</div>
                    <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                      {complaint.categoryConfidence}
                    </div>
                  </div>
                )}
                {complaint.priorityConfidence != null && (
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Priority Confidence</div>
                    <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                      {complaint.priorityConfidence}
                    </div>
                  </div>
                )}
                {complaint.aiModelVersion && (
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Model Version</div>
                    <div style={{ fontSize: "16px", fontWeight: 500, color: "#475569" }}>
                      {complaint.aiModelVersion}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Final Authority - read-only card (same style as AI Advisory) */}
          <div style={{ marginBottom: "32px" }}>
            <h3 className="subsection-title" style={{ marginBottom: "20px" }}>
              Final Authority
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
              Official decision by authorized municipal officials. This is what is used for the complaint.
            </p>
            <div
              style={{
                padding: "24px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Taken by authorized municipal officials.
                </span>
                {isCategoryOverridden && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      backgroundColor: "#ffedd5",
                      border: "1px solid #fed7aa",
                      color: "#9a3412",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Overridden by Human
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Final Category</div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>
                    {finalCategory || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Final Priority</div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>
                    {finalPriority || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Override section - only for admins, below the Final Authority card */}
            {canOverride && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "24px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                  Override final decision
                </div>
                {!showOverrideForm ? (
                  <button
                    type="button"
                    onClick={() => setShowOverrideForm(true)}
                    className="refresh-btn"
                    style={{
                      padding: "10px 20px",
                      fontSize: "14px",
                      borderColor: "#b91c1c",
                      color: "#b91c1c",
                      backgroundColor: "#fff",
                    }}
                  >
                    Override Final Decision
                  </button>
                ) : (
                  <form onSubmit={handleOverrideSubmit}>
                    {overrideError && (
                      <div
                        style={{
                          marginBottom: "16px",
                          padding: "12px 16px",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "4px",
                          fontSize: "14px",
                          color: "#b91c1c",
                        }}
                      >
                        {overrideError}
                      </div>
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                          Final Category
                        </label>
                        <select
                          value={finalCategoryInput}
                          onChange={(e) => setFinalCategoryInput(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            fontSize: "14px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            backgroundColor: "#ffffff",
                            color: "#0f172a",
                            fontFamily: "inherit",
                          }}
                        >
                          <option value="">No change</option>
                          <option value="Sanitation">Sanitation</option>
                          <option value="Roads">Roads</option>
                          <option value="Electricity">Electricity</option>
                          <option value="Water">Water</option>
                          <option value="Uncertain">Uncertain</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                          Final Priority
                        </label>
                        <select
                          value={finalPriorityInput}
                          onChange={(e) => setFinalPriorityInput(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            fontSize: "14px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            backgroundColor: "#ffffff",
                            color: "#0f172a",
                            fontFamily: "inherit",
                          }}
                        >
                          <option value="">No change</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                        Reason for override <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <textarea
                        value={overrideReasonInput}
                        onChange={(e) => setOverrideReasonInput(e.target.value)}
                        placeholder="Explain why you are changing the final category or priority."
                        style={{
                          width: "100%",
                          minHeight: "100px",
                          padding: "12px 16px",
                          fontSize: "14px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          backgroundColor: "#ffffff",
                          color: "#0f172a",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={handleOverrideCancel}
                        className="refresh-btn"
                        disabled={overrideSubmitting}
                        style={{ padding: "10px 20px", fontSize: "14px" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!isOverrideValid || overrideSubmitting}
                        className="refresh-btn"
                        style={{
                          padding: "10px 20px",
                          fontSize: "14px",
                          backgroundColor: "#1e40af",
                          borderColor: "#1e40af",
                          color: "#fff",
                        }}
                      >
                        {overrideSubmitting ? "Submitting…" : "Submit override"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "32px" }}>
            {/* Override Audit - card matching AI Advisory */}
            {hasOverrideAudit && (
              <>
                <h3 className="subsection-title" style={{ marginBottom: "20px" }}>
                  Override Audit
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                  Record of the human override for this complaint.
                </p>
                <div
                  style={{
                    padding: "24px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    borderLeft: "4px solid #f59e0b",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Overridden By</div>
                      <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                        {decidedByName}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Overridden At</div>
                      <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                        {decidedAtFormatted}
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Reason</div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 500,
                          color: "#334155",
                          lineHeight: 1.5,
                          padding: "12px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                        }}
                      >
                        {overrideReason}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* AI Prediction History Timeline */}
            {Array.isArray(complaint.aiPredictionHistory) &&
              complaint.aiPredictionHistory.length > 0 && (
                <AIPredictionTimeline
                  history={complaint.aiPredictionHistory}
                  finalCategory={finalCategory}
                  finalPriority={finalPriority}
                />
              )}
          </div>

          {/* AI Advisory Insights Section - Collapsible, Only for Resolved */}
          {showAdvisorySection && (
            <div style={{ 
              marginTop: "32px", 
              paddingTop: "24px", 
              borderTop: "2px solid #e2e8f0" 
            }}>
              <button
                onClick={() => setIsAdvisoryExpanded(!isAdvisoryExpanded)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "#334155",
                  textAlign: "left",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#f8fafc"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
              >
                <span>AI Advisory Insights (Repeat Pattern Analysis)</span>
                <span style={{ 
                  fontSize: "12px", 
                  color: "#64748b",
                  transition: "transform 0.2s ease",
                  transform: isAdvisoryExpanded ? "rotate(180deg)" : "rotate(0deg)"
                }}>
                  ▼
                </span>
              </button>

              {isAdvisoryExpanded && (
                <div style={{ 
                  marginTop: "16px",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px"
                }}>
                  {/* Muted Advisory Disclaimer */}
                  <div style={{ 
                    marginBottom: "20px",
                    padding: "12px 16px", 
                    backgroundColor: "#f8fafc", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: "4px",
                    fontSize: "13px",
                    color: "#64748b",
                    lineHeight: "1.5"
                  }}>
                    This analysis is advisory only. Final decisions rest with authorized personnel.
                  </div>

                  {/* Loading State */}
                  {analysisLoading && (
                    <div style={{ padding: "32px", textAlign: "center" }}>
                      <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
                      <p style={{ fontSize: "14px", color: "#64748b" }}>Loading advisory insights...</p>
                    </div>
                  )}

                  {/* Advisory Level */}
                  {!analysisLoading && analysisResult && analysisResult.advisoryLevel && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ 
                        fontSize: "13px", 
                        color: "#64748b", 
                        marginBottom: "8px" 
                      }}>
                        Advisory Level:
                      </div>
                      <div style={{ 
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}>
                        <div style={{ 
                          display: "inline-block",
                          padding: "6px 14px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: analysisResult.advisoryLevel === "Strong" ? "#991b1b" : "#92400e",
                          backgroundColor: analysisResult.advisoryLevel === "Strong" ? "#fee2e2" : "#fef3c7",
                          border: `1px solid ${analysisResult.advisoryLevel === "Strong" ? "#dc2626" : "#f59e0b"}`,
                          borderRadius: "4px",
                          width: "fit-content"
                        }}>
                          {analysisResult.advisoryLevel === "Strong" ? "Strong Repeat Pattern" : "Possible Repeat Pattern"}
                        </div>
                        
                        {/* Matching Signals */}
                        {analysisResult.similarComplaints && analysisResult.similarComplaints.length > 0 && analysisResult.similarComplaints[0].matchedSignals && (
                          <div style={{ 
                            fontSize: "12px", 
                            color: "#64748b",
                            paddingLeft: "4px"
                          }}>
                            <span style={{ fontWeight: 500, color: "#475569" }}>Matching signals: </span>
                            {analysisResult.similarComplaints[0].matchedSignals.semantic && (
                              <span style={{ 
                                display: "inline-block",
                                padding: "2px 8px",
                                marginRight: "4px",
                                fontSize: "11px",
                                color: "#334155",
                                backgroundColor: "#e0e7ff",
                                border: "1px solid #c7d2fe",
                                borderRadius: "3px"
                              }}>
                                Semantic
                              </span>
                            )}
                            {analysisResult.similarComplaints[0].matchedSignals.keyword && (
                              <span style={{ 
                                display: "inline-block",
                                padding: "2px 8px",
                                marginRight: "4px",
                                fontSize: "11px",
                                color: "#334155",
                                backgroundColor: "#dbeafe",
                                border: "1px solid #bfdbfe",
                                borderRadius: "3px"
                              }}>
                                Keyword
                              </span>
                            )}
                            {analysisResult.similarComplaints[0].matchedSignals.ward && (
                              <span style={{ 
                                display: "inline-block",
                                padding: "2px 8px",
                                marginRight: "4px",
                                fontSize: "11px",
                                color: "#334155",
                                backgroundColor: "#dcfce7",
                                border: "1px solid #bbf7d0",
                                borderRadius: "3px"
                              }}>
                                Ward
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interpretation */}
                  {!analysisLoading && analysisResult && analysisResult.interpretation && (
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{ 
                        padding: "16px", 
                        backgroundColor: "#f8fafc", 
                        border: "1px solid #e2e8f0", 
                        borderRadius: "4px", 
                        fontSize: "14px", 
                        lineHeight: "1.6", 
                        color: "#334155"
                      }}>
                        {analysisResult.interpretation}
                      </div>
                    </div>
                  )}

                  {/* Supporting Evidence */}
                  {!analysisLoading && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: 500, 
                        color: "#475569", 
                        marginBottom: "12px" 
                      }}>
                        Supporting Evidence
                      </div>
                      
                      {analysisResult && analysisResult.similarComplaints && analysisResult.similarComplaints.length > 0 ? (
                        <div className="admin-table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Complaint ID</th>
                                <th>Title</th>
                                <th>Ward</th>
                                <th>Category</th>
                                <th>Advisory Indicator</th>
                                <th>Resolved At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResult.similarComplaints.map((similar, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#64748b" }}>
                                    {similar.complaintId || "N/A"}
                                  </td>
                                  <td className="table-title">
                                    <div className="table-title-text">{similar.title || "N/A"}</div>
                                  </td>
                                  <td className="table-location">{similar.ward || "N/A"}</td>
                                  <td className="table-category">{similar.category || "N/A"}</td>
                                  <td>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      <span style={{ color: "#64748b", fontSize: "14px" }}>
                                        {similar.similarityScore !== undefined && similar.similarityScore !== null
                                          ? (Number(similar.similarityScore) * 100).toFixed(1) + "%"
                                          : "N/A"}
                                      </span>
                                      {similar.matchedSignals && (
                                        <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.3" }}>
                                          {similar.matchedSignals.semantic && "Semantic "}
                                          {similar.matchedSignals.keyword && "Keyword "}
                                          {similar.matchedSignals.ward && "Ward"}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="table-date">{formatDate(similar.resolvedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : analysisResult ? (
                        <div style={{ 
                          padding: "20px", 
                          backgroundColor: "#f8fafc", 
                          border: "1px solid #e2e8f0", 
                          borderRadius: "4px",
                          fontSize: "14px",
                          color: "#64748b",
                          textAlign: "center"
                        }}>
                          No similar resolved complaints found in recent history.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailView;
