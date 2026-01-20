import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { getHotspots, getSpikes, getAllAlerts } from "../api/adminServices";
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
  Line,
} from "recharts";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Monitoring State
  const [hotspots, setHotspots] = useState([]);
  const [spikes, setSpikes] = useState([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState(null);
  const [hotspotSortField, setHotspotSortField] = useState("severity");
  const [hotspotSortOrder, setHotspotSortOrder] = useState("desc");
  const [spikeSortField, setSpikeSortField] = useState("spikeRatio");
  const [spikeSortOrder, setSpikeSortOrder] = useState("desc");

  // Analytics State
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [priorityDistribution, setPriorityDistribution] = useState([]);
  const [categoryTrends, setCategoryTrends] = useState([]);
  const [wardTrends, setWardTrends] = useState([]);
  const [frequentlyAffectedCategories, setFrequentlyAffectedCategories] = useState([]);
  const [frequentlyAffectedWards, setFrequentlyAffectedWards] = useState([]);
  const [categoryForecasts, setCategoryForecasts] = useState([]);
  const [wardForecasts, setWardForecasts] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Governance State
  const [alerts, setAlerts] = useState([]);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [governanceError, setGovernanceError] = useState(null);

  useEffect(() => {
    fetchComplaints();
    fetchPriorityStats();
    setLastRefreshTime(new Date());
  }, []);

  const handleRefresh = () => {
    if (activeTab === "complaints") {
      fetchComplaints();
      fetchPriorityStats();
    } else if (activeTab === "monitoring") {
      fetchMonitoring();
    } else if (activeTab === "analytics") {
      fetchAnalyticsOverview();
      fetchTrends();
    } else if (activeTab === "predictive") {
      fetchForecasts();
    } else if (activeTab === "governance") {
      fetchAlerts();
    }
    setLastRefreshTime(new Date());
  };

  useEffect(() => {
    if (activeTab === "monitoring") {
      fetchMonitoring();
    } else if (activeTab === "analytics") {
      fetchAnalyticsOverview();
      fetchTrends();
    } else if (activeTab === "predictive") {
      fetchForecasts();
    } else if (activeTab === "governance") {
      fetchAlerts();
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

  // Monitoring: Fetch Hotspots and Spikes
  const fetchMonitoring = async () => {
    setMonitoringLoading(true);
    setMonitoringError(null);
    try {
      const [hotspotsData, spikesData] = await Promise.all([
        getHotspots().catch(() => []),
        getSpikes().catch(() => [])
      ]);
      setHotspots(hotspotsData);
      setSpikes(spikesData);
    } catch (error) {
      console.error("Failed to fetch monitoring data:", error);
      setMonitoringError(error.message || "Failed to load monitoring data");
    } finally {
      setMonitoringLoading(false);
    }
  };

  // Analytics Overview
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

  // Early Issue Detection
  const fetchTrends = async () => {
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
        setFrequentlyAffectedCategories((frequentCategoriesRes.data.categories || []).slice(0, 10));
      }
      if (frequentWardsRes.data.success) {
        const wards = (frequentWardsRes.data.wards || []).slice(0, 10).map(ward => ({
          _id: ward._id,
          count: ward.totalComplaints || 0
        }));
        setFrequentlyAffectedWards(wards);
      }
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    }
  };

  // Predictive Analytics
  const fetchForecasts = async () => {
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
    }
  };

  // Governance: Fetch Alerts
  const fetchAlerts = async () => {
    setGovernanceLoading(true);
    setGovernanceError(null);
    try {
      const alertsData = await getAllAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      setGovernanceError(error.message || "Failed to load alerts");
    } finally {
      setGovernanceLoading(false);
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

  const getSeverityColor = (severity) => {
    if (severity === "High" || severity === "Severe") return "#dc2626";
    if (severity === "Medium" || severity === "Moderate") return "#f59e0b";
    return "#64748b";
  };

  const formatSpikeRatio = (ratio) => {
    if (ratio === null || ratio === undefined) return "0.00";
    return Number(ratio).toFixed(2);
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

  const formatAlertType = (alertType) => {
    if (alertType === "HOTSPOT_ALERT") return "Hotspot Alert";
    if (alertType === "SPIKE_ALERT") return "Spike Alert";
    return alertType || "N/A";
  };

  const getStatusColor = (status) => {
    if (status === "Open") return "#dc2626";
    if (status === "Acknowledged") return "#f59e0b";
    if (status === "Resolved") return "#10b981";
    return "#64748b";
  };

  const handleHotspotSort = (field) => {
    if (hotspotSortField === field) {
      setHotspotSortOrder(hotspotSortOrder === "asc" ? "desc" : "asc");
    } else {
      setHotspotSortField(field);
      setHotspotSortOrder("desc");
    }
  };

  const handleSpikeSort = (field) => {
    if (spikeSortField === field) {
      setSpikeSortOrder(spikeSortOrder === "asc" ? "desc" : "asc");
    } else {
      setSpikeSortField(field);
      setSpikeSortOrder("desc");
    }
  };

  const sortedHotspots = [...hotspots].sort((a, b) => {
    let aValue = a[hotspotSortField];
    let bValue = b[hotspotSortField];

    if (hotspotSortField === "severity") {
      const severityOrder = { High: 2, Medium: 1 };
      aValue = severityOrder[aValue] || 0;
      bValue = severityOrder[bValue] || 0;
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || "";
    }

    if (hotspotSortOrder === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  const sortedSpikes = [...spikes].sort((a, b) => {
    let aValue = a[spikeSortField];
    let bValue = b[spikeSortField];

    if (spikeSortField === "severity") {
      const severityOrder = { Severe: 2, Moderate: 1 };
      aValue = severityOrder[aValue] || 0;
      bValue = severityOrder[bValue] || 0;
    } else if (typeof aValue === "number") {
      // Numeric comparison
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || "";
    }

    if (spikeSortOrder === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

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

        {/* Overview Section */}
        <div className="overview-section">
          <h2 className="overview-title">Overview</h2>
          <div className="overview-stats-grid">
            <div className="overview-stat-card">
              <div className="overview-stat-value">{stats.total}</div>
              <div className="overview-stat-label">Total Complaints</div>
            </div>
            <div className="overview-stat-card overview-stat-high">
              <div className="overview-stat-value">{stats.high}</div>
              <div className="overview-stat-label">High Priority</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", fontWeight: 400 }}>AI-assisted</div>
            </div>
            <div className="overview-stat-card overview-stat-medium">
              <div className="overview-stat-value">{stats.medium}</div>
              <div className="overview-stat-label">Medium Priority</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", fontWeight: 400 }}>AI-assisted</div>
            </div>
            <div className="overview-stat-card overview-stat-low">
              <div className="overview-stat-value">{stats.low}</div>
              <div className="overview-stat-label">Low Priority</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", fontWeight: 400 }}>AI-assisted</div>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "complaints" ? "active" : ""}`}
            onClick={() => setActiveTab("complaints")}
          >
            Complaints
          </button>
          <button
            className={`admin-tab ${activeTab === "monitoring" ? "active" : ""}`}
            onClick={() => setActiveTab("monitoring")}
          >
            Situation Monitoring
          </button>
          <button
            className={`admin-tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
          <button
            className={`admin-tab ${activeTab === "predictive" ? "active" : ""}`}
            onClick={() => setActiveTab("predictive")}
          >
            Predictive Analytics
          </button>
          <button
            className={`admin-tab ${activeTab === "governance" ? "active" : ""}`}
            onClick={() => setActiveTab("governance")}
          >
            Governance
          </button>
        </div>

        {/* Complaints Section */}
        {activeTab === "complaints" && (
          <>
            {successMessage && (
              <div className="admin-success-message">
                {successMessage}
              </div>
            )}

            <div className="admin-section">
              <div className="admin-section-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Complaints</h2>
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
                    <th>Status Update</th>
                    <th>Details</th>
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
                      <td style={{ verticalAlign: "middle" }}>
                        {complaint.isRepeated ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start" }}>
                            <span className={`badge ${getStatusBadge(complaint.status)}`} style={{ display: "inline-block" }}>
                              {complaint.status || "New"}
                            </span>
                            <span style={{ 
                              fontSize: "11px", 
                              color: "#94a3b8",
                              fontWeight: 400,
                              lineHeight: "1.2"
                            }}>
                              Advisory: Potential Repeat
                            </span>
                          </div>
                        ) : (
                          <span className={`badge ${getStatusBadge(complaint.status)}`}>
                            {complaint.status || "New"}
                          </span>
                        )}
                      </td>
                      <td className="table-location">{complaint.location || "N/A"}</td>
                      <td className="table-date">{formatDate(complaint.createdAt)}</td>
                      <td>
                        <select
                          className="status-select"
                          value={complaint.status || "New"}
                          onChange={(e) => updateStatus(complaint._id, e.target.value)}
                          style={{ 
                            padding: "6px 10px",
                            fontSize: "13px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px",
                            backgroundColor: "#ffffff",
                            color: "#334155",
                            cursor: "pointer",
                            minWidth: "140px"
                          }}
                        >
                          <option value="New">New</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/admin/complaints/${complaint._id}`)}
                          className="refresh-btn"
                          style={{ fontSize: "13px", padding: "6px 12px" }}
                        >
                          View Details
                        </button>
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

        {/* Situation Monitoring Section */}
        {activeTab === "monitoring" && (
          <div className="admin-section monitoring-section">
            <div className="admin-section-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>Situation Monitoring</h2>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Last updated: {lastRefreshTime.toLocaleTimeString()}
                  </div>
                  <button onClick={handleRefresh} className="refresh-btn" title="Refresh Data">
                    ↻ Refresh
                  </button>
                </div>
              </div>
            </div>

            {monitoringLoading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Loading monitoring data...</p>
              </div>
            ) : monitoringError ? (
              <div className="empty-state">
                <h3>Error Loading Data</h3>
                <p>{monitoringError}</p>
              </div>
            ) : (
              <>
                {/* A. Chronic Risk Areas (Hotspots) */}
                <div className="monitoring-subsection">
                  <h3 className="subsection-title">A. Chronic Risk Areas (Hotspots)</h3>
                  <p className="monitoring-explanation">
                    High-risk wards and categories based on complaint volume and priority.
                  </p>
                  {hotspots.length === 0 ? (
                    <div className="empty-state" style={{ padding: "40px 24px", textAlign: "left" }}>
                      <h3>No Hotspots Detected</h3>
                      <p>No high-risk areas identified in the last 30 days.</p>
                    </div>
                  ) : (
                    <div className="admin-table-container monitoring-table">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Ward</th>
                            <th>Category</th>
                            <th
                              className="sortable-header"
                              onClick={() => handleHotspotSort("complaintCount")}
                              style={{ cursor: "pointer" }}
                            >
                              Complaint Count {hotspotSortField === "complaintCount" && (hotspotSortOrder === "asc" ? "↑" : "↓")}
                            </th>
                            <th>Hotspot Score</th>
                            <th
                              className="sortable-header"
                              onClick={() => handleHotspotSort("severity")}
                              style={{ cursor: "pointer" }}
                            >
                              Severity {hotspotSortField === "severity" && (hotspotSortOrder === "asc" ? "↑" : "↓")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedHotspots.map((hotspot, idx) => (
                            <tr key={idx}>
                              <td className="table-location">{hotspot.ward || "N/A"}</td>
                              <td className="table-category">{hotspot.category || "N/A"}</td>
                              <td>{hotspot.complaintCount || 0}</td>
                              <td>{hotspot.hotspotScore || 0}</td>
                              <td>
                                <span style={{ color: getSeverityColor(hotspot.severity), fontWeight: 500 }}>
                                  {hotspot.severity || "N/A"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="monitoring-divider"></div>

                {/* B. Recent Abnormal Changes (Spikes) */}
                <div className="monitoring-subsection">
                  <h3 className="subsection-title">B. Recent Abnormal Changes (Spikes)</h3>
                  <p className="monitoring-explanation">
                    Sudden increases in complaint volume compared to historical baseline.
                  </p>
                  {spikes.length === 0 ? (
                    <div className="empty-state" style={{ padding: "40px 24px", textAlign: "left" }}>
                      <h3>No Spikes Detected</h3>
                      <p>No abnormal increases in complaint volume detected in the current week.</p>
                    </div>
                  ) : (
                    <div className="admin-table-container monitoring-table">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Ward</th>
                            <th>Category</th>
                            <th>Baseline Weekly Avg</th>
                            <th>Current Week Count</th>
                            <th
                              className="sortable-header"
                              onClick={() => handleSpikeSort("spikeRatio")}
                              style={{ cursor: "pointer" }}
                            >
                              Spike Ratio {spikeSortField === "spikeRatio" && (spikeSortOrder === "asc" ? "↑" : "↓")}
                            </th>
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
              </>
            )}
          </div>
        )}

        {/* Analytics Section */}
        {activeTab === "analytics" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Analytics</h2>
                  <p style={{ fontSize: "14px", color: "#64748b", marginTop: "8px" }}>
                    Historical data analysis and distribution patterns.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Last updated: {lastRefreshTime.toLocaleTimeString()}
                  </div>
                  <button onClick={handleRefresh} className="refresh-btn" title="Refresh Data">
                    ↻ Refresh
                  </button>
                </div>
              </div>
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
                {/* Analytics Overview */}
                <div className="monitoring-subsection">
                  <h3 className="subsection-title">Analytics Overview</h3>
                  
                  {/* Summary Metrics */}
                  {analyticsSummary && (
                    <div style={{ marginBottom: "32px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Overall Summary
                      </h4>
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
                  {categoryDistribution.length > 0 && (
                    <div style={{ marginBottom: "32px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Category Distribution
                      </h4>
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
                    </div>
                  )}

                  {/* Priority Distribution */}
                  {priorityDistribution.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Priority Distribution
                      </h4>
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
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="monitoring-divider"></div>

                {/* Priority Analytics (AI-Assisted) */}
                <div className="monitoring-subsection">
                  <h3 className="subsection-title">Priority Analytics (AI-Assisted)</h3>
                  <p className="monitoring-explanation" style={{ marginBottom: "24px" }}>
                    Analysis of system-assigned priorities using AI-assisted rule intelligence. Priorities are system-assigned and may be reviewed or overridden by authorized personnel.
                  </p>

                  {/* Priority Distribution (Donut Chart) */}
                  {priorityDistribution.length > 0 && (
                    <div style={{ marginBottom: "48px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                        Priority Distribution
                      </h4>
                      <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", fontStyle: "italic" }}>
                        Priorities are system-assigned using AI-assisted rule intelligence.
                      </p>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={priorityDistribution.map(item => ({
                                name: item._id || "Unknown",
                                value: item.count || 0
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {priorityDistribution.map((entry, index) => {
                                const priorityColors = { High: "#dc2626", Medium: "#f59e0b", Low: "#10b981" };
                                return <Cell key={`cell-${index}`} fill={priorityColors[entry._id] || "#64748b"} />;
                              })}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Priority by Category */}
                  {complaints.length > 0 && (
                    <div style={{ marginBottom: "48px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Priority by Category
                      </h4>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={(() => {
                              const categoryPriorityMap = {};
                              complaints.forEach(complaint => {
                                if (complaint.category && complaint.priority) {
                                  if (!categoryPriorityMap[complaint.category]) {
                                    categoryPriorityMap[complaint.category] = { category: complaint.category, High: 0, Medium: 0, Low: 0 };
                                  }
                                  categoryPriorityMap[complaint.category][complaint.priority] = 
                                    (categoryPriorityMap[complaint.category][complaint.priority] || 0) + 1;
                                }
                              });
                              return Object.values(categoryPriorityMap);
                            })()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="category"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="High" fill="#dc2626" name="High" />
                            <Bar dataKey="Medium" fill="#f59e0b" name="Medium" />
                            <Bar dataKey="Low" fill="#10b981" name="Low" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Priority by Ward */}
                  {complaints.length > 0 && (
                    <div style={{ marginBottom: "48px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Priority by Ward
                      </h4>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={(() => {
                              const wardPriorityMap = {};
                              complaints.forEach(complaint => {
                                if (complaint.ward && complaint.priority) {
                                  if (!wardPriorityMap[complaint.ward]) {
                                    wardPriorityMap[complaint.ward] = { ward: complaint.ward, High: 0, Medium: 0, Low: 0 };
                                  }
                                  wardPriorityMap[complaint.ward][complaint.priority] = 
                                    (wardPriorityMap[complaint.ward][complaint.priority] || 0) + 1;
                                }
                              });
                              return Object.values(wardPriorityMap).slice(0, 10); // Limit to top 10 wards
                            })()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="ward"
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="High" stackId="a" fill="#dc2626" name="High" />
                            <Bar dataKey="Medium" stackId="a" fill="#f59e0b" name="Medium" />
                            <Bar dataKey="Low" stackId="a" fill="#10b981" name="Low" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Priority Trend Over Time */}
                  {complaints.length > 0 && (
                    <div style={{ marginBottom: "32px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Priority Trend Over Time
                      </h4>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart
                            data={(() => {
                              const monthPriorityMap = {};
                              complaints.forEach(complaint => {
                                if (complaint.createdAt && complaint.priority) {
                                  const date = new Date(complaint.createdAt);
                                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                  if (!monthPriorityMap[monthKey]) {
                                    monthPriorityMap[monthKey] = { month: monthKey, High: 0, Medium: 0, Low: 0 };
                                  }
                                  monthPriorityMap[monthKey][complaint.priority] = 
                                    (monthPriorityMap[monthKey][complaint.priority] || 0) + 1;
                                }
                              });
                              return Object.values(monthPriorityMap).sort((a, b) => a.month.localeCompare(b.month));
                            })()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="High" stroke="#dc2626" strokeWidth={2} name="High" />
                            <Line type="monotone" dataKey="Medium" stroke="#f59e0b" strokeWidth={2} name="Medium" />
                            <Line type="monotone" dataKey="Low" stroke="#10b981" strokeWidth={2} name="Low" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="monitoring-divider"></div>

                {/* Early Issue Detection */}
                <div className="monitoring-subsection">
                  <h3 className="subsection-title">Early Issue Detection</h3>
                  <p className="monitoring-explanation">
                    Trend analysis to identify emerging municipal issues.
                  </p>
                  
                  {/* Frequently Affected Areas */}
                  <div style={{ marginBottom: "32px" }}>
                    <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                      Frequently Affected Areas
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      {/* Frequently Affected Categories */}
                      <div>
                        <h5 style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "12px" }}>
                          Top Frequently Affected Categories
                        </h5>
                        {frequentlyAffectedCategories.length === 0 ? (
                          <div className="empty-state" style={{ padding: "20px", textAlign: "left" }}>
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
                        <h5 style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "12px" }}>
                          Top Frequently Affected Wards
                        </h5>
                        {frequentlyAffectedWards.length === 0 ? (
                          <div className="empty-state" style={{ padding: "20px", textAlign: "left" }}>
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
                  {categoryTrends.length === 0 ? (
                    <div style={{ marginBottom: "32px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Category Trend Direction
                      </h4>
                      <div className="empty-state" style={{ padding: "40px 24px", textAlign: "left" }}>
                        <h3>Insufficient Historical Data</h3>
                        <p>Insufficient historical data for trend analysis. At least 2 months of data required.</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: "32px" }}>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Category Trend Direction
                      </h4>
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
                    </div>
                  )}

                  {/* Ward Trend Direction */}
                  {wardTrends.length === 0 ? (
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Ward Trend Direction
                      </h4>
                      <div className="empty-state" style={{ padding: "40px 24px", textAlign: "left" }}>
                        <h3>Insufficient Historical Data</h3>
                        <p>Insufficient historical data for trend analysis. At least 2 months of data required.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                        Ward Trend Direction
                      </h4>
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
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Predictive Analytics Section */}
        {activeTab === "predictive" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Predictive Analytics</h2>
                  <p style={{ fontSize: "14px", color: "#64748b", marginTop: "8px" }}>
                    AI-assisted short-term forecasting for planning purposes.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Last updated: {lastRefreshTime.toLocaleTimeString()}
                  </div>
                  <button onClick={handleRefresh} className="refresh-btn" title="Refresh Data">
                    ↻ Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="monitoring-subsection">
              {/* Category Forecast */}
              {categoryForecasts.length === 0 ? (
                <div style={{ marginBottom: "32px" }}>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                    Category Forecast - 1-Month Ahead
                  </h4>
                  <div className="empty-state" style={{ padding: "40px 24px", textAlign: "left" }}>
                    <h3>Insufficient Historical Data</h3>
                    <p>Insufficient historical data for forecasting. At least 2 months of data required.</p>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: "32px" }}>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                    Category Forecast - 1-Month Ahead
                  </h4>
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
                </div>
              )}

              {/* Divider */}
              <div className="monitoring-divider"></div>

              {/* Ward Forecast */}
              {wardForecasts.length === 0 ? (
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                    Ward Forecast - 1-Month Ahead
                  </h4>
                  <div className="empty-state" style={{ padding: "40px 24px", textAlign: "left" }}>
                    <h3>Insufficient Historical Data</h3>
                    <p>Insufficient historical data for forecasting. At least 2 months of data required.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#334155", marginBottom: "16px" }}>
                    Ward Forecast - 1-Month Ahead
                  </h4>
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* Governance Section */}
        {activeTab === "governance" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="section-title">Governance Alerts</h2>
            </div>

            {governanceLoading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Loading alerts...</p>
              </div>
            ) : governanceError ? (
              <div className="empty-state">
                <h3>Error Loading Data</h3>
                <p>{governanceError}</p>
              </div>
            ) : (
              <>
                {alerts.length === 0 ? (
                  <div className="empty-state">
                    <h3>No Alerts</h3>
                    <p>No governance alerts have been generated.</p>
                  </div>
                ) : (
                  <>
                    {/* Open Alerts */}
                    {alerts.filter((a) => a.status === "Open").length > 0 && (
                      <div style={{ marginBottom: "40px" }}>
                        <h3 className="subsection-title" style={{ color: "#dc2626", marginBottom: "16px" }}>
                          Open Alerts ({alerts.filter((a) => a.status === "Open").length})
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
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {alerts
                                .filter((a) => a.status === "Open")
                                .map((alert) => (
                                  <tr key={alert._id}>
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
                                    <td>
                                      <button
                                        onClick={() => navigate(`/admin/alerts/${alert._id}`)}
                                        className="refresh-btn"
                                        style={{ fontSize: "13px", padding: "6px 12px" }}
                                      >
                                        View Details
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Acknowledged Alerts */}
                    {alerts.filter((a) => a.status === "Acknowledged").length > 0 && (
                      <div style={{ marginBottom: "40px" }}>
                        <h3 className="subsection-title" style={{ color: "#f59e0b", marginBottom: "16px" }}>
                          Acknowledged Alerts ({alerts.filter((a) => a.status === "Acknowledged").length})
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
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {alerts
                                .filter((a) => a.status === "Acknowledged")
                                .map((alert) => (
                                  <tr key={alert._id}>
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
                                    <td>
                                      <button
                                        onClick={() => navigate(`/admin/alerts/${alert._id}`)}
                                        className="refresh-btn"
                                        style={{ fontSize: "13px", padding: "6px 12px" }}
                                      >
                                        View Details
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Resolved Alerts */}
                    {alerts.filter((a) => a.status === "Resolved").length > 0 && (
                      <div style={{ marginBottom: "40px" }}>
                        <h3 className="subsection-title" style={{ color: "#10b981", marginBottom: "16px" }}>
                          Resolved Alerts ({alerts.filter((a) => a.status === "Resolved").length})
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
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {alerts
                                .filter((a) => a.status === "Resolved")
                                .map((alert) => (
                                  <tr key={alert._id}>
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
                                    <td>
                                      <button
                                        onClick={() => navigate(`/admin/alerts/${alert._id}`)}
                                        className="refresh-btn"
                                        style={{ fontSize: "13px", padding: "6px 12px" }}
                                      >
                                        View Details
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
