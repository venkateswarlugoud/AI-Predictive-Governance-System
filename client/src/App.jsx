import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import CreateComplaint from "./pages/CreateComplaint";
import MyComplaints from "./pages/MyComplaints";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import HotspotsView from "./pages/HotspotsView";
import SpikesView from "./pages/SpikesView";
import AlertsListView from "./pages/AlertsListView";
import AlertDetailView from "./pages/AlertDetailView";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace /> : <RegisterPage />}
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MyComplaints />
            </PrivateRoute>
          }
        />
        <Route
          path="/complaint/create"
          element={
            <PrivateRoute>
              <CreateComplaint />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-complaints"
          element={
            <PrivateRoute>
              <MyComplaints />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/hotspots"
          element={
            <AdminRoute>
              <HotspotsView />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/spikes"
          element={
            <AdminRoute>
              <SpikesView />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/alerts"
          element={
            <AdminRoute>
              <AlertsListView />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/alerts/:id"
          element={
            <AdminRoute>
              <AlertDetailView />
            </AdminRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
