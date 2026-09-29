import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Search, 
  Edit3, 
  Eye, 
  RefreshCw, 
  Dumbbell, 
  Trash2,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign
} from "lucide-react";
import API from "../api/client";
import { useToast } from "../context/ToastContext";
import { MemberModal } from "../components/MemberModal";
import { MemberDrawer } from "../components/MemberDrawer";
import { MemberWelcomeModal } from "../components/MemberWelcomeModal";
import { PaymentModal } from "../components/PaymentModal";

export const MembersView = ({ externalSearchQuery = "", onClearSearch }) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState(externalSearchQuery || "");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchTerm(externalSearchQuery);
    }
  }, [externalSearchQuery]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [inspectingMember, setInspectingMember] = useState(null);
  const [welcomeMemberId, setWelcomeMemberId] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      await API.delete(`/members/${memberToDelete.id}`);
      showToast(`Athlete '${memberToDelete.full_name}' was removed successfully.`, "info");
      setMemberToDelete(null);
      fetchMembers();
    } catch (err) {
      console.error("Failed to delete member", err);
      showToast(err.response?.data?.detail || "Failed to remove athlete.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      let url = "/members";
      const params = [];
      if (statusFilter !== "all") params.push(`status=${statusFilter}`);
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await API.get(url);
      setMembers(res.data);
    } catch (err) {
      console.error("Failed to load members", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getAthleteTier = (fee) => {
    if (fee >= 6000) return { label: "PREMIUM", class: "badge-elite" };
    if (fee >= 4000) return { label: "STANDARD", class: "badge-pro" };
    return { label: "BASIC", class: "badge-gym" };
  };

  const getDayWithSuffix = (day) => {
    if (!day) return "1st";
    if (day >= 11 && day <= 13) return `${day}th`;
    const lastDigit = day % 10;
    if (lastDigit === 1) return `${day}st`;
    if (lastDigit === 2) return `${day}nd`;
    if (lastDigit === 3) return `${day}rd`;
    return `${day}th`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="athletic-badge badge-pro">
              <span>MEMBER DIRECTORY</span>
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700 }}>
              {members.length} MEMBERS REGISTERED
            </span>
          </div>
          <h2 style={{ fontSize: "24px" }}>Gym Members & Athlete Directory</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>
            Manage gym memberships, monthly dues billing, and contactless QR entrance access.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchMembers} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Sync Members
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Dumbbell size={15} />
            Enroll Member
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-tab-group">
          {["all", "active", "inactive", "suspended"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`filter-tab-btn ${statusFilter === st ? "active" : ""}`}
            >
              {st}
            </button>
          ))}
        </div>

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

      {/* Members Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Membership Tier</th>
              <th>WhatsApp Contact</th>
              <th>Join Date</th>
              <th>Monthly Fee</th>
              <th>Renewal Day</th>
              <th>Fee Status</th>
              <th>Access Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  <Dumbbell size={32} color="var(--border-medium)" style={{ margin: "0 auto 8px" }} />
                  {loading ? "Loading member directory..." : "No members found in current filter."}
                </td>
              </tr>
            ) : (
              members.map((m) => {
                let cleanPhone = m.phone.replace(/[^0-9]/g, "");
                if (cleanPhone.startsWith("03")) {
                  cleanPhone = "92" + cleanPhone.slice(1);
                }
                const waUrl = `https://wa.me/${cleanPhone}`;
                const tier = getAthleteTier(Number(m.monthly_fee));

                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="athlete-avatar-box">
                          {m.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div 
                            style={{ fontWeight: 700, cursor: "pointer", color: "var(--text-main)", fontSize: "14px" }}
                            onClick={() => setInspectingMember(m)}
                            title="Click to view full payment and attendance ledger"
                          >
                            {m.full_name}
                          </div>
                          {m.emergency_contact && (
                            <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                              Emerg: {m.emergency_contact}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`athletic-badge ${tier.class}`} style={{ fontSize: "11px" }}>
                        <span>{tier.label}</span>
                      </span>
                    </td>
                    <td>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--color-whatsapp)",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontWeight: 600,
                          fontSize: "13px",
                        }}
                      >
                        <MessageCircle size={14} />
                        {m.phone}
                      </a>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      {new Date(m.join_date).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "14px" }}>
                      Rs. {Number(m.monthly_fee).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: "13px" }}>
                        {getDayWithSuffix(m.billing_cycle_day)}
                      </span>
                    </td>
                    <td>
                      {m.current_fee_status === "paid" ? (
                        <span className="badge badge-paid" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={12} /> Paid
                        </span>
                      ) : m.current_fee_status === "overdue" ? (
                        <span className="badge badge-overdue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AlertCircle size={12} /> Overdue
                        </span>
                      ) : (
                        <span className="badge badge-unpaid" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={12} /> Unpaid
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${m.status}`}>{m.status}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {m.current_fee_status !== "paid" && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ 
                              padding: "4px 9px", 
                              fontSize: "11.5px", 
                              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                              borderColor: "transparent",
                              color: "white",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            onClick={() => setSelectedFeeForPayment({
                              id: m.current_fee_id,
                              amount_due: m.monthly_fee,
                              memberName: m.full_name,
                            })}
                            title={`Collect fee from ${m.full_name}`}
                          >
                            <DollarSign size={13} />
                            Collect
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "4px 8px", color: "var(--color-whatsapp)" }}
                          onClick={() => setWelcomeMemberId(m.id)}
                          title="Send WhatsApp Welcome Pass & QR Link"
                        >
                          <MessageCircle size={13} />
                          Pass
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "4px 9px", fontSize: "11.5px" }}
                          onClick={() => setInspectingMember(m)}
                          title="View Ledger & Attendance"
                        >
                          <Eye size={13} />
                          Ledger
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "4px 8px" }}
                          onClick={() => setEditingMember(m)}
                          title="Edit Athlete Profile"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ 
                            padding: "4px 8px", 
                            color: "var(--danger)", 
                            borderColor: "rgba(239, 68, 68, 0.25)" 
                          }}
                          onClick={() => setMemberToDelete(m)}
                          title={`Remove ${m.full_name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
          memberName={selectedFeeForPayment.memberName}
          onClose={() => setSelectedFeeForPayment(null)}
          onSuccess={() => {
            fetchMembers();
          }}
        />
      )}

      {showAddModal && (
        <MemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchMembers();
          }}
        />
      )}

      {editingMember && (
        <MemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={fetchMembers}
        />
      )}

      {inspectingMember && (
        <MemberDrawer
          member={inspectingMember}
          onClose={() => setInspectingMember(null)}
          onRefresh={fetchMembers}
        />
      )}

      {welcomeMemberId && (
        <MemberWelcomeModal
          memberId={welcomeMemberId}
          onClose={() => setWelcomeMemberId(null)}
        />
      )}

      {/* Athlete Removal Confirmation Modal */}
      {memberToDelete && createPortal(
        <div className="modal-overlay" onClick={() => !deleting && setMemberToDelete(null)}>
          <div 
            className="modal-dialog" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "420px", padding: "24px", textAlign: "center" }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: "19px", fontWeight: 800, marginBottom: "8px" }}>
              Remove Athlete?
            </h3>

            <p style={{ color: "var(--text-muted)", fontSize: "13.5px", lineHeight: 1.5, marginBottom: "20px" }}>
              Are you sure you want to remove <strong style={{ color: "var(--text-main)" }}>{memberToDelete.full_name}</strong>?
              This will permanently delete their athlete profile, entrance pass, fee transactions, and attendance scan history.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "20px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMemberToDelete(null)}
                disabled={deleting}
                style={{
                  padding: "9px 20px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  background: "#DC2626",
                  backgroundColor: "#DC2626",
                  color: "#FFFFFF",
                  border: "1px solid #DC2626",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "9px 20px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                  cursor: "pointer",
                }}
              >
                {deleting ? (
                  <RefreshCw size={15} className="spin" color="#FFFFFF" />
                ) : (
                  <Trash2 size={15} color="#FFFFFF" />
                )}
                <span style={{ color: "#FFFFFF" }}>{deleting ? "Removing..." : "Yes, Remove Athlete"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
