import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import "./AdminDashboard.css";

const ComplaintDetailView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Repeat Pattern Analysis State
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  
  // Collapsible section state
  const [isAdvisoryExpanded, setIsAdvisoryExpanded] = useState(false);

  useEffect(() => {
    setAnalysisTriggered(false);
    setAnalysisResult(null);
    setAnalysisError(null);
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

  return (
    <div className="page-container">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Complaint Review</h1>
            <p className="admin-subtitle">Review complaint details</p>
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
                    {complaint.category || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Ward</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {complaint.ward || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Priority</div>
                  <div>
                    <span className={`badge ${getPriorityBadge(complaint.priority)}`}>
                      {complaint.priority || "N/A"}
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
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Created Date</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#334155" }}>
                    {formatDate(complaint.createdAt)}
                  </div>
                </div>
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
