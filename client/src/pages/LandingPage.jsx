import { Link } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            AI-Based Municipal Grievance
            <span className="gradient-text"> Management System</span>
          </h1>
          <p className="hero-description">
            Report municipal issues, track resolution progress, and experience 
            transparent, data-driven civic services. Powered by AI to help 
            municipal authorities serve you better.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-large">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary btn-large">
              Sign In
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="card-icon">🏛️</div>
            <h3>Transparent Municipal Services</h3>
            <p>Real-time tracking of your civic complaints</p>
          </div>
          <div className="hero-card">
            <div className="card-icon">🤖</div>
            <h3>AI-Powered Municipal Planning</h3>
            <p>Predict complaint hotspots and prioritize areas</p>
          </div>
          <div className="hero-card">
            <div className="card-icon">📊</div>
            <h3>Data-Driven City Management</h3>
            <p>Evidence-based municipal resource allocation</p>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">Why AI-Based Municipal Management?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Faster Municipal Response</h3>
              <p>
                AI algorithms prioritize municipal complaints based on urgency, 
                location, and historical data, ensuring critical civic issues 
                like road damage and water supply are addressed first.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Predictive Municipal Analytics</h3>
              <p>
                Identify patterns and predict municipal complaint hotspots 
                before they escalate, enabling proactive city planning and 
                better resource allocation for infrastructure maintenance.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Municipal Performance Tracking</h3>
              <p>
                Comprehensive dashboards provide insights into 
                municipal complaint resolution times, success rates, and 
                citizen satisfaction with civic services.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>
                Your data is protected with enterprise-grade security. 
                All communications are encrypted and compliant with 
                data protection regulations.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Accessible Anywhere</h3>
              <p>
                Submit and track complaints from any device, 
                anywhere. Responsive design ensures seamless 
                experience across platforms.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Citizen-Centric Municipal Services</h3>
              <p>
                Built with citizens in mind. Simple, intuitive 
                interface that makes reporting municipal issues 
                effortless and transparent.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Ready to Report Municipal Issues?</h2>
            <p>Join thousands of citizens using AI-powered municipal grievance management system</p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-large">
                Create Account
              </Link>
              <Link to="/login" className="btn btn-secondary btn-large">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
