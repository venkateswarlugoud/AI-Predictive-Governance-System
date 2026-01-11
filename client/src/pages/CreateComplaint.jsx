import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./CreateComplaint.css";

const CreateComplaint = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    ward: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!formData.ward) {
      newErrors.ward = "Ward selection is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await API.post("/complaint", formData);
      if (response.data.success || response.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } else {
        setErrors({
          submit:
            response.data.message ||
            "Failed to submit municipal grievance. Please try again.",
        });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit municipal grievance. Please try again.";
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <div className="create-complaint-header">
          <h1 className="page-title">Report Municipal Issue</h1>
          <p className="page-subtitle">
            Submit a grievance to help improve municipal services in your area
          </p>
        </div>

        <div className="create-complaint-card">
          {success && (
            <div className="success-message">
              ✓ Municipal grievance submitted successfully! Redirecting...
            </div>
          )}

          {errors.submit && (
            <div className="error-message">{errors.submit}</div>
          )}

          <form onSubmit={handleSubmit} className="complaint-form">
            <div className="form-group">
              <label className="form-label">Issue Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleChange}
              />
              {errors.title && <div className="error-message">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Ward *</label>
              <select
                name="ward"
                className="form-input"
                value={formData.ward}
                onChange={handleChange}
              >
                <option value="">Select Ward</option>
                <option value="Ward-1">Ward 1</option>
                <option value="Ward-2">Ward 2</option>
                <option value="Ward-3">Ward 3</option>
                <option value="Ward-4">Ward 4</option>
              </select>
              {errors.ward && <div className="error-message">{errors.ward}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Location *</label>
              <input
                type="text"
                name="location"
                className="form-input"
                value={formData.location}
                onChange={handleChange}
              />
              {errors.location && (
                <div className="error-message">{errors.location}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                name="description"
                className="form-textarea"
                rows={6}
                value={formData.description}
                onChange={handleChange}
              />
              {errors.description && (
                <div className="error-message">{errors.description}</div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit Grievance"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateComplaint;
