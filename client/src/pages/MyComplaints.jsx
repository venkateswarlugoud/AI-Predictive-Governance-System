import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "./Dashboard.css";

const MyComplaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await API.get("/complaint/my");
      if (response.data.success && response.data.complaints) {
        setComplaints(response.data.complaints);
      } else {
        setComplaints(response.data.complaints || response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch complaints:", error);
      setComplaints([]);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const filteredComplaints =
    filter === "all"
      ? complaints
      : complaints.filter((c) => {
          if (filter === "New") {
            return c.status === "New" || c.status === "Pending";
          }
          return c.status === filter;
        });

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
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">My Municipal Grievances</h2>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                className={`filter-tab ${filter === "New" ? "active" : ""}`}
                onClick={() => setFilter("New")}
              >
                New
              </button>
              <button
                className={`filter-tab ${filter === "In Progress" ? "active" : ""}`}
                onClick={() => setFilter("In Progress")}
              >
                In Progress
              </button>
              <button
                className={`filter-tab ${filter === "Resolved" ? "active" : ""}`}
                onClick={() => setFilter("Resolved")}
              >
                Resolved
              </button>
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No grievances found</h3>
              <p>
                {filter === "all"
                  ? "You haven't submitted any municipal grievances yet."
                  : `No grievances with status "${filter}".`}
              </p>
              {filter === "all" && (
                <Link to="/complaint/create" className="btn btn-primary">
                  Report Your First Municipal Issue
                </Link>
              )}
            </div>
          ) : (
            <div className="complaints-grid">
              {filteredComplaints.map((complaint) => (
                <div key={complaint._id} className="complaint-card">
                  <div className="complaint-header">
                    <h3 className="complaint-title">{complaint.title || "Untitled Complaint"}</h3>
                    <span className={`badge ${getStatusBadge(complaint.status)}`}>
                      {complaint.status || "Pending"}
                    </span>
                  </div>
                  <p className="complaint-description">{complaint.description || "No description provided"}</p>
                  <div className="complaint-meta">
                    <div className="meta-item">
                      <span className="meta-label">Category:</span>
                      <span className="meta-value">{complaint.category || "N/A"}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Location:</span>
                      <span className="meta-value">{complaint.location || "N/A"}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Submitted:</span>
                      <span className="meta-value">{formatDate(complaint.createdAt)}</span>
                    </div>
                    {complaint.lastNotifiedAt && (
                      <div className="meta-item">
                        <span className="meta-label">Notifications:</span>
                        <span className="meta-value">
                          Email sent on {formatDate(complaint.lastNotifiedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              marginTop: "16px",
              padding: "10px 12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            <strong>Notification disclaimer:</strong>{" "}
            Notifications are informational and do not indicate complaint resolution. Notifications are for
            information only. They do not replace official actions by authorities.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyComplaints;
