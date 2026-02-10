import { useState, useEffect, useRef } from "react";
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

  // City and Ward selection state
  const [cities, setCities] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardSearchQuery, setWardSearchQuery] = useState("");
  const [wardLoading, setWardLoading] = useState(false);
  const [wardError, setWardError] = useState(null);
  const [showWardDropdown, setShowWardDropdown] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const wardInputRef = useRef(null);
  const wardDropdownRef = useRef(null);

  // Fetch cities on component mount
  useEffect(() => {
    const fetchCities = async () => {
      setCityLoading(true);
      setCityError(null);
      try {
        const response = await API.get("/cities");
        if (Array.isArray(response.data)) {
          setCities(response.data);
        } else {
          setCityError("Failed to load cities");
          setCities([]);
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch cities";
        setCityError(errorMessage);
        setCities([]);
      } finally {
        setCityLoading(false);
      }
    };

    fetchCities();
  }, []);

  // Fetch wards when city changes
  useEffect(() => {
    const fetchWards = async () => {
      if (!selectedCity || selectedCity.trim() === "") {
        setWards([]);
        setSelectedWard(null);
        setFormData((prev) => ({ ...prev, ward: "" }));
        setWardSearchQuery("");
        setWardError(null);
        return;
      }

      setWardLoading(true);
      setWardError(null);

      try {
        const response = await API.get(`/wards?city=${encodeURIComponent(selectedCity)}`);
        if (Array.isArray(response.data)) {
          setWards(response.data);
          if (response.data.length === 0) {
            setWardError(null);
          }
        } else {
          setWardError("Failed to fetch wards");
          setWards([]);
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch wards. Please try again.";
        setWardError(errorMessage);
        setWards([]);
      } finally {
        setWardLoading(false);
      }
    };

    fetchWards();
  }, [selectedCity]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wardDropdownRef.current &&
        !wardDropdownRef.current.contains(event.target) &&
        wardInputRef.current &&
        !wardInputRef.current.contains(event.target)
      ) {
        setShowWardDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter wards based on search query
  const filteredWards = wards.filter((ward) => {
    const searchLower = wardSearchQuery.toLowerCase();
    return (
      ward.label.toLowerCase().includes(searchLower) ||
      ward.wardNumber.toString().includes(searchLower) ||
      ward.value.toLowerCase().includes(searchLower)
    );
  });

  const handleCityChange = (e) => {
    const cityValue = e.target.value;
    setSelectedCity(cityValue);
    setSelectedWard(null);
    setFormData((prev) => ({ ...prev, ward: "" }));
    setWardSearchQuery("");
    setShowWardDropdown(false);
    if (errors.city) {
      setErrors((prev) => ({ ...prev, city: "" }));
    }
    if (errors.ward) {
      setErrors((prev) => ({ ...prev, ward: "" }));
    }
  };

  const handleWardSearchChange = (e) => {
    const query = e.target.value;
    setWardSearchQuery(query);
    setShowWardDropdown(true);
    setSelectedWard(null);
    setFormData((prev) => ({ ...prev, ward: "" }));
    if (errors.ward) {
      setErrors((prev) => ({ ...prev, ward: "" }));
    }
  };

  const handleWardSelect = (ward) => {
    setSelectedWard(ward);
    setWardSearchQuery(ward.label);
    setFormData((prev) => ({ ...prev, ward: ward.value }));
    setShowWardDropdown(false);
    if (errors.ward) {
      setErrors((prev) => ({ ...prev, ward: "" }));
    }
  };

  const handleWardInputFocus = () => {
    if (filteredWards.length > 0) {
      setShowWardDropdown(true);
    }
  };

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

    if (!selectedCity || selectedCity.trim() === "") {
      newErrors.city = "City is required";
    }

    if (!selectedWard || !formData.ward) {
      newErrors.ward = "Ward selection is required. Please select a ward from the list.";
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
              <label className="form-label">City *</label>
              <select
                name="city"
                className="form-input"
                value={selectedCity}
                onChange={handleCityChange}
                disabled={cityLoading}
              >
                <option value="">
                  {cityLoading ? "Loading cities..." : "Select City"}
                </option>
                {cities.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
              {errors.city && <div className="error-message">{errors.city}</div>}
              {cityError && <div className="error-message">{cityError}</div>}
              {wardLoading && selectedCity && (
                <div className="form-hint">Loading wards...</div>
              )}
              {wardError && <div className="error-message">{wardError}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Ward *</label>
              <div className="ward-autocomplete-wrapper">
                <input
                  ref={wardInputRef}
                  type="text"
                  name="wardSearch"
                  className="form-input"
                  value={wardSearchQuery}
                  onChange={handleWardSearchChange}
                  onFocus={handleWardInputFocus}
                  placeholder={
                    !selectedCity
                      ? "Please select a city first"
                      : wardLoading
                      ? "Loading wards..."
                      : wards.length === 0
                      ? "No wards found for this city"
                      : "Search and select a ward"
                  }
                  disabled={!selectedCity || wardLoading || wards.length === 0}
                  autoComplete="off"
                />
                {showWardDropdown && filteredWards.length > 0 && (
                  <div ref={wardDropdownRef} className="ward-dropdown">
                    {filteredWards.map((ward) => (
                      <div
                        key={ward._id}
                        className={`ward-option ${
                          selectedWard?._id === ward._id ? "selected" : ""
                        }`}
                        onClick={() => handleWardSelect(ward)}
                      >
                        <div className="ward-option-text">
                          {ward.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showWardDropdown &&
                  wardSearchQuery &&
                  filteredWards.length === 0 &&
                  !wardLoading && (
                    <div className="ward-dropdown">
                      <div className="ward-option no-results">
                        No wards found matching "{wardSearchQuery}"
                      </div>
                    </div>
                  )}
              </div>
              {errors.ward && <div className="error-message">{errors.ward}</div>}
              {selectedWard && (
                <div className="form-hint">
                  Selected: {selectedWard.label}
                </div>
              )}
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
