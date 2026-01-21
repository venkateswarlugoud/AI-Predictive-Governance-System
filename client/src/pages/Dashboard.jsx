import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "./Dashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const stats = {
    total: complaints.length,
    new: complaints.filter((c) => c.status === "New" || c.status === "Pending").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
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
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Welcome back, {user?.name}</h1>
            <p className="dashboard-subtitle">Manage your municipal grievances and track their resolution progress</p>
          </div>
          <Link to="/complaint/create" className="btn btn-primary">
            + Report Municipal Issue
          </Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Grievances</div>
          </div>
          <div className="stat-card stat-new">
            <div className="stat-value">{stats.new}</div>
            <div className="stat-label">New</div>
          </div>
          <div className="stat-card stat-progress">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card stat-resolved">
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">My Municipal Grievances</h2>
            <div className="filter-tabs">
              <button className="filter-tab active">All</button>
            </div>
          </div>

          {complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No grievances found</h3>
              <p>You haven't submitted any municipal grievances yet.</p>
              <Link to="/complaint/create" className="btn btn-primary">
                Report Your First Municipal Issue
              </Link>
            </div>
          ) : (
            <div className="complaints-grid">
              {complaints.slice(0, 6).map((complaint) => (
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
