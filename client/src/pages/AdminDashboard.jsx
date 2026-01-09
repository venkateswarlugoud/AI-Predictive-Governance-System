import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityStats, setPriorityStats] = useState({ High: 0, Medium: 0, Low: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchComplaints();
    fetchPriorityStats();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await API.get("/complaint");
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

  const fetchPriorityStats = async () => {
    try {
      const response = await API.get("/analytics/by-priority");
      if (response.data.success && response.data.priorities) {
        const stats = { High: 0, Medium: 0, Low: 0 };
        response.data.priorities.forEach((item) => {
          if (item._id && stats.hasOwnProperty(item._id)) {
            stats[item._id] = item.count || 0;
          }
        });
        setPriorityStats(stats);
      }
    } catch (error) {
      console.error("Failed to fetch priority stats:", error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const response = await API.put(`/complaint/${id}`, { status });
      if (response.data.success || response.status === 200) {
        setComplaints((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: response.data.complaint?.status || status } : c))
        );
        setSuccessMessage("Status updated successfully");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        alert(response.data.message || "Failed to update status.");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(error.response?.data?.message || "Failed to update status. Please try again.");
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

  // Get unique categories from complaints
  const categories = [...new Set(complaints.map((c) => c.category).filter(Boolean))].sort();

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesStatus =
      statusFilter === "all" ||
      complaint.status === statusFilter ||
      (statusFilter === "New" && (complaint.status === "New" || complaint.status === "Pending"));
    const matchesPriority = priorityFilter === "all" || complaint.priority === priorityFilter;
    const matchesCategory = categoryFilter === "all" || complaint.category === categoryFilter;
    return matchesStatus && matchesPriority && matchesCategory;
  });

  const stats = {
    total: complaints.length,
    high: priorityStats.High,
    medium: priorityStats.Medium,
    low: priorityStats.Low,
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
            <h1 className="admin-title">Municipal Dashboard</h1>
            <p className="admin-subtitle">Manage and track all citizen municipal grievances</p>
          </div>
          <div className="admin-user">
            <span className="admin-user-name">{user?.name}</span>
            <span className="admin-user-role">Municipal Officer</span>
          </div>
        </div>

        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats.total}</div>
              <div className="admin-stat-label">Total Complaints</div>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-high">
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats.high}</div>
              <div className="admin-stat-label">High Priority</div>
              <div className="admin-stat-sublabel">AI-detected</div>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-medium">
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats.medium}</div>
              <div className="admin-stat-label">Medium Priority</div>
              <div className="admin-stat-sublabel">AI-detected</div>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-low">
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats.low}</div>
              <div className="admin-stat-label">Low Priority</div>
              <div className="admin-stat-sublabel">AI-detected</div>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="admin-success-message">
            {successMessage}
          </div>
        )}

        <div className="admin-section">
          <div className="admin-section-header">
            <h2 className="section-title">Complaints Management</h2>
            <div className="admin-filters">
              <div className="filter-group">
                <label className="filter-label">Category</label>
                <select
                  className="form-select filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Priority</label>
                <select
                  className="form-select filter-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select
                  className="form-select filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No complaints found</h3>
              <p>
                {statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all"
                  ? "No complaints match the selected filters."
                  : "No complaints have been submitted yet."}
              </p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Complaint Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((complaint) => (
                    <tr key={complaint._id}>
                      <td className="table-title">
                        <div className="table-title-text">{complaint.title || "N/A"}</div>
                        <div className="table-description">{complaint.description || "No description"}</div>
                      </td>
                      <td className="table-category">{complaint.category || "N/A"}</td>
                      <td>
                        <span className={`badge ${getPriorityBadge(complaint.priority)}`}>
                          {complaint.priority || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(complaint.status)}`}>
                          {complaint.status || "New"}
                        </span>
                      </td>
                      <td className="table-location">{complaint.location || "N/A"}</td>
                      <td className="table-date">{formatDate(complaint.createdAt)}</td>
                      <td>
                        <select
                          className="status-select"
                          value={complaint.status || "New"}
                          onChange={(e) => updateStatus(complaint._id, e.target.value)}
                        >
                          <option value="New">New</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
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

export default AdminDashboard;
