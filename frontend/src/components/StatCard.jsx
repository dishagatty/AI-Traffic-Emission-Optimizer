function StatCard({
  title,
  value,
  subtitle,
  icon,
  type
}) {

  return (
    <div className="stat-card">

      <div className={`stat-icon ${type}`}>
        {icon}
      </div>

      <div className="stat-content">

        <span>{title}</span>

        <h2>{value}</h2>

        <small>{subtitle}</small>

      </div>

    </div>
  );
}

export default StatCard;