import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "./ConfirmationModal";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    navigate("/");
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--primary-color)"/>
            <path d="M16 8L20 14H12L16 8Z" fill="white"/>
            <path d="M10 18L16 24L22 18H10Z" fill="white"/>
          </svg>
          <span>Municipal Grievance</span>
        </Link>

        <div className="navbar-menu">
          {user ? (
            <>
              {user.role === "admin" ? (
                <Link to="/admin" className="navbar-link">Municipal Dashboard</Link>
              ) : (
                <>
                  <Link to="/dashboard" className="navbar-link">Dashboard</Link>
                  <Link to="/complaint/create" className="navbar-link">Create Complaint</Link>
                  <Link to="/my-complaints" className="navbar-link">My Complaints</Link>
                </>
              )}
              <div className="navbar-user">
                <span className="navbar-user-name">{user.name}</span>
                <button onClick={handleLogoutClick} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
      />
    </nav>
  );
};

export default Navbar;
