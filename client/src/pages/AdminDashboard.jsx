import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("complaints");
  
  // Complaints Management State
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityStats, setPriorityStats] = useState({ High: 0, Medium: 0, Low: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  // Analytics Overview State (Screen 1)
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [priorityDistribution, setPriorityDistribution] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Early Issue Detection State (Screen 2)
  const [categoryTrends, setCategoryTrends] = useState([]);
  const [wardTrends, setWardTrends] = useState([]);
  const [frequentlyAffectedCategories, setFrequentlyAffectedCategories] = useState([]);
  const [frequentlyAffectedWards, setFrequentlyAffectedWards] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState(null);

  // Predictive Analytics State (Screen 3)
  const [categoryForecasts, setCategoryForecasts] = useState([]);
  const [wardForecasts, setWardForecasts] = useState([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  useEffect(() => {
    fetchComplaints();
    fetchPriorityStats();
    setLastRefreshTime(new Date());
  }, []);

  const handleRefresh = () => {
    if (activeTab === "complaints") {
      fetchComplaints();
      fetchPriorityStats();
    } else if (activeTab === "analytics") {
      fetchAnalyticsOverview();
    } else if (activeTab === "trends") {
      fetchTrends();
    } else if (activeTab === "forecast") {
      fetchForecasts();
    }
    setLastRefreshTime(new Date());
  };

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalyticsOverview();
    } else if (activeTab === "trends") {
      fetchTrends();
    } else if (activeTab === "forecast") {
      fetchForecasts();
    }
  }, [activeTab]);

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

  // Screen 1: Analytics Overview
  const fetchAnalyticsOverview = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const [summaryRes, categoryRes, priorityRes] = await Promise.all([
        API.get("/analytics/summary"),
        API.get("/analytics/by-category"),
        API.get("/analytics/by-priority")
      ]);

      if (summaryRes.data.success) {
        setAnalyticsSummary(summaryRes.data);
      }
      if (categoryRes.data.success) {
        setCategoryDistribution(categoryRes.data.categories || []);
      }
      if (priorityRes.data.success) {
        setPriorityDistribution(priorityRes.data.priorities || []);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setAnalyticsError(error.response?.data?.message || "Failed to load analytics data");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Screen 2: Early Issue Detection
  const fetchTrends = async () => {
    setTrendsLoading(true);
    setTrendsError(null);
    try {
      const [categoryRes, wardRes, frequentCategoriesRes, frequentWardsRes] = await Promise.all([
        API.get("/analytics/trend/category"),
        API.get("/analytics/trend/ward"),
        API.get("/analytics/by-category").catch(() => ({ data: { success: false } })),
        API.get("/analytics/by-ward").catch(() => ({ data: { success: false } }))
      ]);

      if (categoryRes.data.success) {
        setCategoryTrends(categoryRes.data.trends || []);
      }
      if (wardRes.data.success) {
        setWardTrends(wardRes.data.trends || []);
      }
      if (frequentCategoriesRes.data.success) {
        // Get top 10 frequently affected categories (already sorted by count descending)
        setFrequentlyAffectedCategories((frequentCategoriesRes.data.categories || []).slice(0, 10));
      }
      if (frequentWardsRes.data.success) {
        // Get top 10 frequently affected wards (already sorted by totalComplaints descending)
        // Backend returns: { _id: "<ward>", totalComplaints: <number> }
        const wards = (frequentWardsRes.data.wards || []).slice(0, 10).map(ward => ({
          _id: ward._id,
          count: ward.totalComplaints || 0
        }));
        setFrequentlyAffectedWards(wards);
      }
    } catch (error) {
      console.error("Failed to fetch trends:", error);
      setTrendsError(error.response?.data?.message || "Failed to load trend data");
    } finally {
      setTrendsLoading(false);
    }
  };

  // Screen 3: Predictive Analytics
  const fetchForecasts = async () => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const [categoryRes, wardRes] = await Promise.all([
        API.get("/analytics/forecast/category"),
        API.get("/analytics/forecast/ward")
      ]);

      if (categoryRes.data.success) {
        setCategoryForecasts(categoryRes.data.forecasts || []);
      }
      if (wardRes.data.success) {
        setWardForecasts(wardRes.data.forecasts || []);
      }
    } catch (error) {
      console.error("Failed to fetch forecasts:", error);
      setForecastError(error.response?.data?.message || "Failed to load forecast data");
    } finally {
      setForecastLoading(false);
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

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return num.toLocaleString("en-US");
  };

  const getTrendBadge = (trend) => {
    const trendLower = trend?.toLowerCase();
    if (trendLower === "increasing") return "badge-trend-increasing";
    if (trendLower === "decreasing") return "badge-trend-decreasing";
    return "badge-trend-stable";
  };

  const capitalizeFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Get unique categories from complaints
  const categories = [...new Set(complaints.map((c) => c.category).filter(Boolean))].sort();

  // Search and filter complaints
  const filteredComplaints = complaints.filter((complaint) => {
    const matchesStatus =
      statusFilter === "all" ||
      complaint.status === statusFilter ||
      (statusFilter === "New" && (complaint.status === "New" || complaint.status === "Pending"));
    const matchesPriority = priorityFilter === "all" || complaint.priority === priorityFilter;
    const matchesCategory = categoryFilter === "all" || complaint.category === categoryFilter;
    
    // Search functionality
    const matchesSearch = !searchQuery || 
      (complaint.title && complaint.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (complaint.description && complaint.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (complaint.location && complaint.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (complaint.ward && complaint.ward.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (complaint.category && complaint.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  });

  // Sorting
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (sortField === "createdAt") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
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

  // Pagination
  const totalPages = Math.ceil(sortedComplaints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedComplaints = sortedComplaints.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Title", "Category", "Priority", "Status", "Location", "Ward", "Created Date"];
    const rows = sortedComplaints.map(complaint => [
      complaint.title || "",
      complaint.category || "",
      complaint.priority || "",
      complaint.status || "",
      complaint.location || "",
      complaint.ward || "",
      formatDate(complaint.createdAt)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `complaints_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

        {/* Tab Navigation */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "complaints" ? "active" : ""}`}
            onClick={() => setActiveTab("complaints")}
          >
            Complaints Management
          </button>
          <button
            className={`admin-tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics Overview
          </button>
          <button
            className={`admin-tab ${activeTab === "trends" ? "active" : ""}`}
            onClick={() => setActiveTab("trends")}
          >
            Early Issue Detection
          </button>
          <button
            className={`admin-tab ${activeTab === "forecast" ? "active" : ""}`}
            onClick={() => setActiveTab("forecast")}
          >
            Predictive Analytics
          </button>
        </div>

        {/* Complaints Management Tab */}
        {activeTab === "complaints" && (
          <>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Complaints Management</h2>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Last updated: {lastRefreshTime.toLocaleTimeString()}
                    </div>
                    <button onClick={handleRefresh} className="refresh-btn" title="Refresh Data">
                      ↻ Refresh
                    </button>
                    <button onClick={exportToCSV} className="export-btn" title="Export to CSV">
                      📥 Export CSV
                    </button>
                    <button onClick={() => window.print()} className="print-btn" title="Print">
                      🖨️ Print
                    </button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div style={{ marginBottom: "16px" }}>
                  <input
                    type="text"
                    placeholder="Search complaints by title, description, location, ward, or category..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="search-input"
                  />
                </div>
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

          <div style={{ marginBottom: "16px", fontSize: "14px", color: "#64748b" }}>
            Showing {startIndex + 1}-{Math.min(endIndex, sortedComplaints.length)} of {sortedComplaints.length} complaints
            {searchQuery && ` (filtered from ${complaints.length} total)`}
          </div>

          {sortedComplaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No complaints found</h3>
              <p>
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all"
                  ? "No complaints match the selected filters or search query."
                  : "No complaints have been submitted yet."}
              </p>
            </div>
          ) : (
            <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort("title")}
                      style={{ cursor: "pointer" }}
                    >
                      Complaint Title {sortField === "title" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort("category")}
                      style={{ cursor: "pointer" }}
                    >
                      Category {sortField === "category" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort("priority")}
                      style={{ cursor: "pointer" }}
                    >
                      Priority {sortField === "priority" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort("status")}
                      style={{ cursor: "pointer" }}
                    >
                      Status {sortField === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Location</th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort("createdAt")}
                      style={{ cursor: "pointer" }}
                    >
                      Created Date {sortField === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedComplaints.map((complaint) => (
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  <label style={{ marginRight: "8px", fontSize: "14px" }}>Items per page:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="pagination-select"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ‹ Prev
                  </button>
                  <span className="pagination-page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    »»
                  </button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
          </>
        )}

        {/* Screen 1: Analytics Overview */}
        {activeTab === "analytics" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="section-title">Analytics Overview - Historical Data Analysis</h2>
            </div>

            {analyticsLoading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Loading analytics data...</p>
              </div>
            ) : analyticsError ? (
              <div className="empty-state">
                <h3>Error Loading Data</h3>
                <p>{analyticsError}</p>
              </div>
            ) : (
              <>
                {/* Summary Metrics */}
                {analyticsSummary && (
                  <div className="analytics-summary-section">
                    <h3 className="subsection-title">Overall Summary</h3>
                    <div className="admin-stats-grid">
                      <div className="admin-stat-card">
                        <div className="admin-stat-content">
                          <div className="admin-stat-value">{formatNumber(analyticsSummary.totalComplaints || 0)}</div>
                          <div className="admin-stat-label">Total Complaints</div>
                        </div>
                      </div>
                      {analyticsSummary.statusBreakdown?.map((status) => (
                        <div key={status._id} className="admin-stat-card">
                          <div className="admin-stat-content">
                            <div className="admin-stat-value">{formatNumber(status.count || 0)}</div>
                            <div className="admin-stat-label">{status._id || "Unknown"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Status Breakdown Chart */}
                    {analyticsSummary.statusBreakdown && analyticsSummary.statusBreakdown.length > 0 && (
                      <div className="chart-container">
                        <h4 className="chart-title">Status Distribution</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={analyticsSummary.statusBreakdown.map(s => ({ name: s._id || "Unknown", value: s.count || 0 }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {analyticsSummary.statusBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={["#1e40af", "#f59e0b", "#10b981", "#64748b"][index % 4]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Category Distribution */}
                <div className="analytics-table-section">
                  <h3 className="subsection-title">Category Distribution</h3>
                  {categoryDistribution.length === 0 ? (
                    <div className="empty-state">
                      <p>No category data available</p>
                    </div>
                  ) : (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={categoryDistribution.map(item => ({ name: item._id || "Unknown", count: item.count || 0 }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#1e40af" name="Complaints" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="admin-table-container" style={{ marginTop: "24px" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryDistribution.map((item, idx) => (
                              <tr key={idx}>
                                <td className="table-category">{item._id || "Unknown"}</td>
                                <td>{formatNumber(item.count || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Priority Distribution */}
                <div className="analytics-table-section">
                  <h3 className="subsection-title">Priority Distribution</h3>
                  {priorityDistribution.length === 0 ? (
                    <div className="empty-state">
                      <p>No priority data available</p>
                    </div>
                  ) : (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={priorityDistribution.map(item => ({
                              name: item._id || "Unknown",
                              count: item.count || 0
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Complaints">
                              {priorityDistribution.map((entry, index) => {
                                const priorityColors = { High: "#dc2626", Medium: "#f59e0b", Low: "#10b981" };
                                return <Cell key={`cell-${index}`} fill={priorityColors[entry._id] || "#64748b"} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="admin-table-container" style={{ marginTop: "24px" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Priority</th>
                              <th>Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {priorityDistribution.map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  <span className={`badge ${getPriorityBadge(item._id)}`}>
                                    {item._id || "Unknown"}
                                  </span>
                                </td>
                                <td>{formatNumber(item.count || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Screen 2: Early Issue Detection */}
        {activeTab === "trends" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="section-title">Early Detection of Emerging Municipal Issues</h2>
            </div>

            {trendsLoading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Loading trend data...</p>
              </div>
            ) : trendsError ? (
              <div className="empty-state">
                <h3>Error Loading Data</h3>
                <p>{trendsError}</p>
              </div>
            ) : (
              <>
                {/* Frequently Affected Areas */}
                <div className="analytics-table-section">
                  <h3 className="subsection-title">Frequently Affected Areas</h3>
                  
                  <div className="frequently-affected-grid">
                    {/* Frequently Affected Categories */}
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "12px" }}>
                        Top Frequently Affected Categories
                      </h4>
                      {frequentlyAffectedCategories.length === 0 ? (
                        <div className="empty-state" style={{ padding: "20px" }}>
                          <p style={{ fontSize: "13px" }}>No category data available</p>
                        </div>
                      ) : (
                        <div className="admin-table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Category</th>
                                <th>Total Complaints</th>
                              </tr>
                            </thead>
                            <tbody>
                              {frequentlyAffectedCategories.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="table-category">{item._id || "Unknown"}</td>
                                  <td><strong>{formatNumber(item.count || 0)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Frequently Affected Wards */}
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "12px" }}>
                        Top Frequently Affected Wards
                      </h4>
                      {frequentlyAffectedWards.length === 0 ? (
                        <div className="empty-state" style={{ padding: "20px" }}>
                          <p style={{ fontSize: "13px" }}>No ward data available</p>
                        </div>
                      ) : (
                        <div className="admin-table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Ward</th>
                                <th>Total Complaints</th>
                              </tr>
                            </thead>
                            <tbody>
                              {frequentlyAffectedWards.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="table-location">{item._id || item.ward || "Unknown"}</td>
                                  <td><strong>{formatNumber(item.count || 0)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Trend Direction */}
                <div className="analytics-table-section">
                  <h3 className="subsection-title">Category Trend Direction</h3>
                  {categoryTrends.length === 0 ? (
                    <div className="empty-state">
                      <h3>Insufficient Historical Data</h3>
                      <p>Insufficient historical data for trend analysis. At least 2 months of data required.</p>
                    </div>
                  ) : (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={categoryTrends.map(trend => ({
                              name: trend.category || "Unknown",
                              previous: trend.previousMonthCount || 0,
                              current: trend.currentMonthCount || 0
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="previous" fill="#94a3b8" name="Previous Month" />
                            <Bar dataKey="current" fill="#1e40af" name="Current Month" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="admin-table-container" style={{ marginTop: "24px" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Previous Month</th>
                              <th>Current Month</th>
                              <th>Trend Direction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryTrends.map((trend, idx) => (
                              <tr key={idx}>
                                <td className="table-category">{trend.category || "Unknown"}</td>
                                <td>{formatNumber(trend.previousMonthCount || 0)}</td>
                                <td>{formatNumber(trend.currentMonthCount || 0)}</td>
                                <td>
                                  <span className={`badge ${getTrendBadge(trend.trend)}`}>
                                    {capitalizeFirst(trend.trend || "Unknown")}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Ward Trend Direction */}
                <div className="analytics-table-section">
                  <h3 className="subsection-title">Ward Trend Direction</h3>
                  {wardTrends.length === 0 ? (
                    <div className="empty-state">
                      <h3>Insufficient Historical Data</h3>
                      <p>Insufficient historical data for trend analysis. At least 2 months of data required.</p>
                    </div>
                  ) : (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={wardTrends.map(trend => ({
                              name: trend.ward || "Unknown",
                              previous: trend.previousMonthCount || 0,
                              current: trend.currentMonthCount || 0
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="previous" fill="#94a3b8" name="Previous Month" />
                            <Bar dataKey="current" fill="#1e40af" name="Current Month" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="admin-table-container" style={{ marginTop: "24px" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Ward</th>
                              <th>Previous Month</th>
                              <th>Current Month</th>
                              <th>Trend Direction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wardTrends.map((trend, idx) => (
                              <tr key={idx}>
                                <td className="table-location">{trend.ward || "Unknown"}</td>
                                <td>{formatNumber(trend.previousMonthCount || 0)}</td>
                                <td>{formatNumber(trend.currentMonthCount || 0)}</td>
                                <td>
                                  <span className={`badge ${getTrendBadge(trend.trend)}`}>
                                    {capitalizeFirst(trend.trend || "Unknown")}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Screen 3: Predictive Analytics */}
        {activeTab === "forecast" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="section-title">AI-Assisted Short-Term Forecasting for Planning</h2>
            </div>

            {forecastLoading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Loading forecast data...</p>
              </div>
            ) : forecastError ? (
              <div className="empty-state">
                <h3>Error Loading Data</h3>
                <p>{forecastError}</p>
              </div>
            ) : (
              <>
                {/* Category Forecast */}
                <div className="analytics-table-section">
                  <h3 className="subsection-title">Category Forecast - 1-Month Ahead</h3>
                  {categoryForecasts.length === 0 ? (
                    <div className="empty-state">
                      <h3>Insufficient Historical Data</h3>
                      <p>Insufficient historical data for forecasting. At least 2 months of data required.</p>
                    </div>
                  ) : (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={categoryForecasts.map(forecast => ({
                              name: forecast.category || "Unknown",
                              lastMonth: forecast.lastMonthCount || 0,
                              predicted: forecast.predictedNextMonth || 0
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="lastMonth" fill="#94a3b8" name="Last Month" />
                            <Bar dataKey="predicted" fill="#10b981" name="Predicted Next Month" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="admin-table-container" style={{ marginTop: "24px" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Last Month Count</th>
                              <th>Predicted Next Month</th>
                              <th>Forecast Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryForecasts.map((forecast, idx) => (
                              <tr key={idx}>
                                <td className="table-category">{forecast.category || "Unknown"}</td>
                                <td>{formatNumber(forecast.lastMonthCount || 0)}</td>
                                <td><strong>{formatNumber(forecast.predictedNextMonth || 0)}</strong></td>
                                <td>{forecast.method || "Linear Trend Projection"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Ward Forecast */}
                <div className="analytics-table-section">
                  <h3 className="subsection-title">Ward Forecast - 1-Month Ahead</h3>
                  {wardForecasts.length === 0 ? (
                    <div className="empty-state">
                      <h3>Insufficient Historical Data</h3>
                      <p>Insufficient historical data for forecasting. At least 2 months of data required.</p>
                    </div>
                  ) : (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={wardForecasts.map(forecast => ({
                              name: forecast.ward || "Unknown",
                              lastMonth: forecast.lastMonthCount || 0,
                              predicted: forecast.predictedNextMonth || 0
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="lastMonth" fill="#94a3b8" name="Last Month" />
                            <Bar dataKey="predicted" fill="#10b981" name="Predicted Next Month" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="admin-table-container" style={{ marginTop: "24px" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Ward</th>
                              <th>Last Month Count</th>
                              <th>Predicted Next Month</th>
                              <th>Forecast Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wardForecasts.map((forecast, idx) => (
                              <tr key={idx}>
                                <td className="table-location">{forecast.ward || "Unknown"}</td>
                                <td>{formatNumber(forecast.lastMonthCount || 0)}</td>
                                <td><strong>{formatNumber(forecast.predictedNextMonth || 0)}</strong></td>
                                <td>{forecast.method || "Linear Trend Projection"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
