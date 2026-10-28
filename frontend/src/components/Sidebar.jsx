import {
  LayoutDashboard,
  Map,
  Brain,
  BarChart3,
  FlaskConical,
  Settings,
  FileText,
  Leaf,
  LogOut
} from "lucide-react";

function Sidebar({ role, activePage, setActivePage }) {

  const userMenu = [
    {
      name: "Dashboard",
      icon: LayoutDashboard
    },
    {
      name: "Traffic Map",
      icon: Map
    },
    {
      name: "AI Prediction",
      icon: Brain
    },
    {
      name: "Traffic & Emissions",
      icon: Leaf
    }
  ];

  const adminMenu = [
    {
      name: "Overview",
      icon: LayoutDashboard
    },
    {
      name: "Traffic Map",
      icon: Map
    },
    {
      name: "AI Prediction",
      icon: Brain
    },
    {
      name: "SHAP Explainability",
      icon: BarChart3
    },
    {
      name: "What-If Simulation",
      icon: FlaskConical
    },
    {
      name: "Intervention Optimizer",
      icon: Settings
    },
    {
      name: "Emission Analytics",
      icon: Leaf
    },
    {
      name: "Reports",
      icon: FileText
    }
  ];

  const menu = role === "admin" ? adminMenu : userMenu;

  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <div className="logo-icon">AI</div>

        <div>
          <h2>Traffic</h2>
          <span>Optimizer</span>
        </div>
      </div>

      <div className="sidebar-section">
        {menu.map((item) => {

          const Icon = item.icon;

          return (
            <button
              key={item.name}
              className={`sidebar-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </button>
          );

        })}
      </div>

      <div className="sidebar-bottom">

        <button className="sidebar-item">
          <Settings size={19} />
          <span>Settings</span>
        </button>

        <button className="sidebar-item logout">
          <LogOut size={19} />
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;