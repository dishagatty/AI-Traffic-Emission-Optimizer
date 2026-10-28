import { useState } from "react";
import TrafficMap from "../../components/TrafficMap";
import {
  Car,
  AlertTriangle,
  Map,
  Wind,
  TrendingUp
} from "lucide-react";
import StatCard from "../../components/StatCard";

function AdminDashboard() {
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  const handleRoadSelect = (road) => {
    setSelectedRoad(road);
    setSelectedRecommendation(null);
  };

  const handleRecommendationSelect = (recommendation) => {
    setSelectedRoad(null);
    setSelectedRecommendation(recommendation);
  };

  return (
    <div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Traffic Control Overview</h2>
          <p>
            Real-time urban traffic and emission monitoring
          </p>
        </div>

        <div className="date-info">
          Mangaluru • Live Monitoring
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-grid">

        <StatCard
          title="Monitored Roads"
          value="7"
          subtitle="Active traffic locations"
          icon={<Map size={20} />}
          type="blue"
        />

        <StatCard
          title="Traffic Volume"
          value="38,408"
          subtitle="Vehicles monitored"
          icon={<Car size={20} />}
          type="green"
        />

        <StatCard
          title="Severe Roads"
          value="4"
          subtitle="Require attention"
          icon={<AlertTriangle size={20} />}
          type="red"
        />

        <StatCard
          title="CO₂ Emissions"
          value="683.45 kg"
          subtitle="Current estimate"
          icon={<Wind size={20} />}
          type="orange"
        />

      </div>

      {/* Main Dashboard */}
      <div className="dashboard-grid">

        {/* Traffic Map */}
        <div className="dashboard-card map-card">

          <div className="card-header">
            <div>
              <h3>Traffic Map</h3>
              <p>
                Live congestion status across monitored roads
              </p>
            </div>

            <div className="live-badge">
              <span></span>
              Live
            </div>
          </div>

          <div className="map-container">

            <TrafficMap
              onRoadSelect={handleRoadSelect}
              onRecommendationSelect={handleRecommendationSelect}
            />

          </div>

        </div>

        {/* Traffic Status */}
        <div className="dashboard-card">

          <div className="card-header">
            <div>
              <h3>Traffic Status</h3>
              <p>
                Current congestion distribution
              </p>
            </div>
          </div>

          <div className="traffic-status">

            <div className="status-row">
              <span>Severe</span>

              <div className="progress">
                <div
                  className="progress-fill severe"
                  style={{ width: "70%" }}
                />
              </div>

              <strong>4</strong>
            </div>

            <div className="status-row">
              <span>High</span>

              <div className="progress">
                <div
                  className="progress-fill high"
                  style={{ width: "40%" }}
                />
              </div>

              <strong>2</strong>
            </div>

            <div className="status-row">
              <span>Moderate</span>

              <div className="progress">
                <div
                  className="progress-fill moderate"
                  style={{ width: "25%" }}
                />
              </div>

              <strong>1</strong>
            </div>

            <div className="status-row">
              <span>Low</span>

              <div className="progress">
                <div
                  className="progress-fill low"
                  style={{ width: "10%" }}
                />
              </div>

              <strong>0</strong>
            </div>

          </div>

        </div>

      </div>

      {/* AI Recommendation */}
      <div className="recommendation-card">

        <div className="recommendation-icon">
          <TrendingUp size={22} />
        </div>

        <div className="recommendation-content">

          <span>AI RECOMMENDATION</span>

          <h3>
            Signal Timing Intervention
          </h3>

          <p>
            Recommended configuration:
            <strong> 45s N/S + 39s E/W</strong>
          </p>

        </div>

        <button className="primary-button">
          View Intervention
        </button>

      </div>

    </div>
  );
}

export default AdminDashboard;

