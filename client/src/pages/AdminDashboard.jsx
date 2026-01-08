import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchComplaints();
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

  const updateStatus = async (id, status) => {
    try {
      const response = await API.put(`/complaint/${id}`, { status });
      if (response.data.success || response.status === 200) {
        setComplaints((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: response.data.complaint?.status || status } : c))
        );
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

  const filteredComplaints = complaints.filter((complaint) => {
    let matchesFilter = filter === "all" || complaint.status === filter;
    if (filter === "New") {
      matchesFilter = complaint.status === "New" || complaint.status === "Pending";
    }
    const matchesSearch =
      searchTerm === "" ||
      (complaint.title && complaint.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (complaint.description && complaint.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (complaint.location && complaint.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (complaint.category && complaint.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

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
            <div className="admin-stat-icon">📊</div>
            <div>
              <div className="admin-stat-value">{stats.total}</div>
              <div className="admin-stat-label">Total Grievances</div>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-new">
            <div className="admin-stat-icon">🆕</div>
            <div>
              <div className="admin-stat-value">{stats.new}</div>
              <div className="admin-stat-label">New</div>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-progress">
            <div className="admin-stat-icon">⚙️</div>
            <div>
              <div className="admin-stat-value">{stats.inProgress}</div>
              <div className="admin-stat-label">In Progress</div>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-resolved">
            <div className="admin-stat-icon">✅</div>
            <div>
              <div className="admin-stat-value">{stats.resolved}</div>
              <div className="admin-stat-label">Resolved</div>
            </div>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-header">
            <h2 className="section-title">All Municipal Grievances</h2>
            <div className="admin-controls">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search municipal grievances..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="search-icon">🔍</span>
              </div>
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
                  New/Pending
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
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No grievances found</h3>
              <p>
                {searchTerm
                  ? "No municipal grievances match your search criteria."
                  : filter !== "all"
                  ? `No grievances with status "${filter}".`
                  : "No municipal grievances have been submitted yet."}
              </p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Submitted By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((complaint) => (
                    <tr key={complaint._id}>
                      <td className="table-id">#{complaint._id.slice(-6)}</td>
                      <td className="table-title">
                        <div className="table-title-text">{complaint.title || "N/A"}</div>
                        <div className="table-description">{complaint.description || "No description"}</div>
                      </td>
                      <td className="table-category">{complaint.category || "N/A"}</td>
                      <td className="table-location">{complaint.location || "N/A"}</td>
                      <td className="table-user">
                        {complaint.user?.name || complaint.userId?.name || "N/A"}
                      </td>
                      <td className="table-date">{formatDate(complaint.createdAt)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(complaint.status)}`}>
                          {complaint.status}
                        </span>
                      </td>
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
