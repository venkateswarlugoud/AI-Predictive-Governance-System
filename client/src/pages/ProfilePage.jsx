import { useAuth } from "../context/AuthContext";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <div className="container">
        <div className="profile-header">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">View and manage your account information</p>
        </div>

        <div className="profile-card">
          <div className="profile-section">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{user?.name || "User"}</h2>
              <p className="profile-email">{user?.email || ""}</p>
              <span className={`badge ${user?.role === "admin" ? "badge-in-progress" : "badge-new"}`}>
                {user?.role === "admin" ? "Municipal Officer" : "Citizen"}
              </span>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-row">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{user?.name || "N/A"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email Address</span>
              <span className="detail-value">{user?.email || "N/A"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Account Type</span>
              <span className="detail-value">
                {user?.role === "admin" ? "Municipal Officer" : "Citizen"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
