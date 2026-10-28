import { Bell, ChevronDown } from "lucide-react";

function Topbar({ role }) {

  return (
    <header className="topbar">

      <div>
        <h1>
          {role === "admin"
            ? "Traffic Control Center"
            : "Traffic Dashboard"}
        </h1>

        <p>
          AI-powered urban traffic and emission monitoring
        </p>
      </div>

      <div className="topbar-right">

        <div className="system-status">
          <span></span>
          System Online
        </div>

        <button className="notification">
          <Bell size={19} />
        </button>

        <div className="profile">
          <div className="profile-avatar">
            {role === "admin" ? "A" : "U"}
          </div>

          <div className="profile-info">
            <strong>
              {role === "admin"
                ? "Traffic Admin"
                : "Normal User"}
            </strong>

            <span>
              {role === "admin"
                ? "Administrator"
                : "User"}
            </span>
          </div>

          <ChevronDown size={16} />
        </div>

      </div>

    </header>
  );
}

export default Topbar;