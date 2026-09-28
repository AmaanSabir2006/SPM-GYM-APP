import React, { useState, useEffect } from "react";
import { 
  CalendarCheck, 
  Users, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  QrCode, 
  RefreshCw,
  Search
} from "lucide-react";
import API from "../api/client";

export const AttendanceView = () => {
  const [stats, setStats] = useState(null);
  const [todayList, setTodayList] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const [statsRes, todayRes, memRes] = await Promise.all([
        API.get("/attendance/stats"),
        API.get("/attendance/today"),
        API.get("/members"),
      ]);
      setStats(statsRes.data);
      setTodayList(todayRes.data);

      const map = {};
      memRes.data.forEach((m) => {
        map[m.id] = m;
      });
      setMembersMap(map);
    } catch (err) {
      console.error("Failed to load attendance", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const filteredAttendance = todayList.filter((att) => {
    const member = membersMap[att.member_id];
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = member?.full_name?.toLowerCase().includes(term);
    const phoneMatch = member?.phone?.includes(term);
    return nameMatch || phoneMatch || att.member_id.includes(term);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "22px" }}>Contactless Entrance Attendance</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>
            Live check-in verification via entrance QR scans.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadAttendance} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Refresh Live Roster
        </button>
      </div>

      {/* KPI Stats Matching Dashboard Executive Style */}
      <div className="stat-boxes-grid attendance-stat-grid">
        {/* Card 1: Checked In Today (Emerald Green Style) */}
        <div className="stat-box stat-box-green">
          <div className="stat-box-top">
            <div className="stat-box-title-group">
              <span className="stat-box-label">CHECKED IN TODAY</span>
              <span className="stat-box-sub">Daily Live Attendance</span>
            </div>
            <div className="stat-box-icon-circle">
              <Clock size={16} />
            </div>
          </div>
          <div className="stat-box-value">
            {stats?.total_today || todayList.length || 0}
          </div>
          <div className="stat-box-footer">
            <span className="kpi-trend-pill-success">
              Live Today
            </span>
            <span className="stat-box-action">• Front desk entrance</span>
          </div>
        </div>

        {/* Card 2: Weekly Check-in Volume (Royal Blue Style) */}
        <div className="stat-box stat-box-blue">
          <div className="stat-box-top">
            <div className="stat-box-title-group">
              <span className="stat-box-label">WEEKLY CHECK-IN VOLUME</span>
              <span className="stat-box-sub">Past 7 Days</span>
            </div>
            <div className="stat-box-icon-circle">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="stat-box-value">
            {stats?.weekly_count || 0}
          </div>
          <div className="stat-box-footer">
            <span className="kpi-trend-pill-blue">
              7-Day Activity
            </span>
            <span className="stat-box-action">• Total entrance scans</span>
          </div>
        </div>

        {/* Card 3: Active Athletes This Week (Warm Amber Style) */}
        <div className="stat-box stat-box-amber">
          <div className="stat-box-top">
            <div className="stat-box-title-group">
              <span className="stat-box-label">ACTIVE ATHLETES</span>
              <span className="stat-box-sub">Floor Headcount</span>
            </div>
            <div className="stat-box-icon-circle">
              <Users size={16} />
            </div>
          </div>
          <div className="stat-box-value">
            {stats?.unique_members_this_week || 0}
          </div>
          <div className="stat-box-footer">
            <span className="kpi-trend-pill-warning">
              Unique Members
            </span>
            <span className="stat-box-action">• Active floor presence</span>
          </div>
        </div>
      </div>

      {/* Live Table */}
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <h3 style={{ fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarCheck size={18} color="#10B981" />
            Today's Check-in Log ({filteredAttendance.length})
          </h3>
          <div className="search-input-wrapper" style={{ maxWidth: "260px" }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search athlete..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Athlete Name</th>
                <th>Phone</th>
                <th>Time Checked In</th>
                <th>Check-in Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    {loading ? "Loading attendance logs..." : "No check-ins logged for today yet."}
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((att) => {
                  const member = membersMap[att.member_id];
                  const name = member?.full_name || `Member #${att.member_id.substring(0, 8)}`;
                  const phone = member?.phone || "—";

                  return (
                    <tr key={att.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                          <span style={{ fontWeight: 600 }}>{name}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{phone}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-active" style={{ fontSize: "11px" }}>
                          {att.check_in_method}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--color-success)", fontSize: "12px", fontWeight: 600 }}>
                          <CheckCircle2 size={14} />
                          Verified
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
