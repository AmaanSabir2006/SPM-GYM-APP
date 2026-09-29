import React, { useState, useEffect } from "react";
import { 
  Receipt, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Search, 
  Filter,
  DollarSign,
  Calendar,
  RefreshCw,
  Zap,
  Flame,
  Dumbbell
} from "lucide-react";
import API from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { PaymentModal } from "../components/PaymentModal";

export const FeesView = ({ onRefreshAlerts }) => {
  const { gym } = useAuth();
  const [records, setRecords] = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'overdue', 'unpaid', 'paid'
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [generatingDues, setGeneratingDues] = useState(false);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, memRes] = await Promise.all([
        API.get(statusFilter === "all" ? "/fees/records" : `/fees/records?status=${statusFilter}`),
        API.get("/members"),
      ]);
      setRecords(recRes.data);

      const map = {};
      memRes.data.forEach((m) => {
        map[m.id] = m;
      });
      setMembersMap(map);
    } catch (err) {
      console.error("Failed to load fee ledger", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleGenerateDues = async () => {
    setGeneratingDues(true);
    try {
      const res = await API.post("/fees/generate-monthly-dues");
      showToast(res.data.message || "Monthly dues generated!", "success");
      loadData();
      onRefreshAlerts && onRefreshAlerts();
    } catch (err) {
      showToast("Failed to generate monthly dues", "error");
    } finally {
      setGeneratingDues(false);
    }
  };

  const filteredRecords = records.filter((rec) => {
    const member = membersMap[rec.member_id];
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = member?.full_name?.toLowerCase().includes(term);
    const phoneMatch = member?.phone?.includes(term);
    return nameMatch || phoneMatch;
  });

  const gymName = gym?.name || "the gym";

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="athletic-badge badge-pro">
              <span>FEE MANAGEMENT</span>
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700 }}>
              AUTOMATED DUES & WHATSAPP REMINDERS
            </span>
          </div>
          <h2 style={{ fontSize: "24px" }}>Membership Dues & Fee Collection Ledger</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>
            1-tap personalized WhatsApp reminders to follow up on pending dues and maintain steady cash flow.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Sync Ledger
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleGenerateDues} disabled={generatingDues}>
            <Zap size={15} />
            {generatingDues ? "Generating..." : "Generate Monthly Dues"}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {/* Filter and Search Bar */}
      <div className="filter-bar">
        {/* Status Filter Tabs */}
        <div className="filter-tab-group">
          {["all", "overdue", "unpaid", "paid"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`filter-tab-btn ${statusFilter === status ? "active" : ""}`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search athlete or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Athlete Name</th>
              <th>WhatsApp Phone</th>
              <th>Due Date</th>
              <th>Amount Due</th>
              <th>Payment State</th>
              <th>1-Tap Action</th>
              <th>Record Payment</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  <Receipt size={32} color="var(--border-medium)" style={{ margin: "0 auto 8px" }} />
                  {loading ? "Loading fee records..." : "No fee dues match the selected filter."}
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const member = membersMap[rec.member_id];
                const memberName = member?.full_name || "Unknown Athlete";
                let phone = member?.phone || "";
                let cleanPhone = phone.replace(/[^0-9]/g, "");
                if (cleanPhone.startsWith("03")) {
                  cleanPhone = "92" + cleanPhone.slice(1);
                }

                // Professional fee reminder notification template
                const msg = encodeURIComponent(
                  `Assalam-o-Alaikum ${memberName},\n\nThis is a notification from ${gymName} regarding your monthly membership fee of Rs. ${Number(rec.amount_due).toLocaleString()} (Due Date: ${new Date(rec.due_date).toLocaleDateString()}).\nKindly clear your dues via EasyPaisa, JazzCash, or at the front desk to ensure uninterrupted contactless gym access.\n\nThank you.`
                );
                const whatsappUrl = `https://wa.me/${cleanPhone}?text=${msg}`;

                return (
                  <tr key={rec.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "14px" }}>
                        {memberName}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>{phone || "—"}</td>
                    <td style={{ fontSize: "13px" }}>{new Date(rec.due_date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 800, fontSize: "15px", fontFamily: "var(--font-athletic)", letterSpacing: "0.02em" }}>
                      Rs. {Number(rec.amount_due).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${rec.payment_status}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {rec.payment_status === "overdue" && <AlertCircle size={11} />}
                        {rec.payment_status === "paid" && <CheckCircle2 size={11} />}
                        {rec.payment_status === "pending" && <Clock size={11} />}
                        <span>{rec.payment_status}</span>
                      </span>
                    </td>
                    <td>
                      {rec.payment_status !== "paid" ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-whatsapp btn-sm"
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                        >
                          <MessageCircle size={14} />
                          Send WhatsApp
                        </a>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>Cleared</span>
                      )}
                    </td>
                    <td>
                      {rec.payment_status !== "paid" ? (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                          onClick={() => setSelectedFeeForPayment(rec)}
                        >
                          Mark as Paid
                        </button>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-success)", fontSize: "12.5px", fontWeight: 700 }}>
                          <CheckCircle2 size={15} />
                          Paid ({rec.payment_method?.toUpperCase()})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedFeeForPayment && (
        <PaymentModal
          feeRecord={selectedFeeForPayment}
          memberName={membersMap[selectedFeeForPayment.member_id]?.full_name}
          onClose={() => setSelectedFeeForPayment(null)}
          onSuccess={() => {
            loadData();
            onRefreshAlerts && onRefreshAlerts();
          }}
        />
      )}
    </div>
  );
};
