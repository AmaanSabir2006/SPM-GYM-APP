import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Phone, Calendar, Receipt, Clock, CheckCircle2, AlertCircle, MessageCircle, CreditCard, Trash2 } from "lucide-react";
import API from "../api/client";
import { useToast } from "../context/ToastContext";
import { PaymentModal } from "./PaymentModal";

export const MemberDrawer = ({ member, onClose, onRefresh }) => {
  const { showToast } = useToast();
  const [ledger, setLedger] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteMember = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await API.delete(`/members/${member.id}`);
      showToast(`Athlete '${member.full_name}' was removed.`, "info");
      onRefresh && onRefresh();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to remove member.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const fetchDetails = async () => {
    if (!member) return;
    setLoading(true);
    try {
      const [ledgerRes, attRes] = await Promise.all([
        API.get(`/fees/members/${member.id}/ledger`),
        API.get(`/attendance/members/${member.id}/history?limit=30`),
      ]);
      setLedger(ledgerRes.data);
      setAttendance(attRes.data.history || []);
    } catch (err) {
      console.error("Failed to load member records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [member]);

  if (!member) return null;

  // Clean phone number for WhatsApp link
  let phone = member.phone.replace(/[^0-9]/g, "");
  if (phone.startsWith("03")) {
    phone = "92" + phone.slice(1);
  }
  const getDayWithSuffix = (day) => {
    if (!day) return "1st";
    if (day >= 11 && day <= 13) return `${day}th`;
    const lastDigit = day % 10;
    if (lastDigit === 1) return `${day}st`;
    if (lastDigit === 2) return `${day}nd`;
    if (lastDigit === 3) return `${day}rd`;
    return `${day}th`;
  };

  const whatsappUrl = `https://wa.me/${phone}`;

  const drawerContent = (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-header">
          <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "19px", fontWeight: 800, margin: 0, wordBreak: "break-word" }}>
                {member.full_name}
              </h3>
              <span className={`badge badge-${member.status}`}>
                {member.status}
              </span>
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "4px" }}>
              Member since {new Date(member.join_date).toLocaleDateString()}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDeleteMember}
              disabled={deleting}
              style={{
                color: confirmDelete ? "white" : "var(--danger)",
                background: confirmDelete ? "var(--danger)" : "transparent",
                borderColor: "rgba(239, 68, 68, 0.35)",
                fontSize: "12px",
                padding: "5px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontWeight: 700,
                transition: "all 0.15s ease",
              }}
              title="Remove Athlete and their history"
            >
              <Trash2 size={13} />
              <span>{confirmDelete ? "Confirm Delete?" : "Remove"}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="drawer-info-grid">
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
              Monthly Fee
            </div>
            <div style={{ fontWeight: 800, color: "var(--primary)", fontSize: "16px", marginTop: "2px" }}>
              Rs. {Number(member.monthly_fee).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
              Monthly Due Day
            </div>
            <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "14px", marginTop: "2px" }}>
              {getDayWithSuffix(member.billing_cycle_day)} of month
            </div>
          </div>
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
              WhatsApp Phone
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-whatsapp)",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "13px",
                marginTop: "2px",
              }}
            >
              <MessageCircle size={14} />
              {member.phone}
            </a>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="drawer-content">
          {/* Fee Ledger Section */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
                <Receipt size={17} color="var(--primary)" />
                Payment Ledger History ({ledger.length})
              </h4>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "13px" }}>
                Loading ledger records...
              </div>
            ) : ledger.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "14px 16px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                No fee records generated yet. Click "Generate Month Dues" on the dashboard to trigger billing.
              </div>
            ) : (
              <div className="table-container" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                <table className="custom-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Due Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((rec) => (
                      <tr key={rec.id}>
                        <td style={{ fontSize: "12.5px" }}>{new Date(rec.due_date).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 800, fontSize: "13.5px" }}>Rs. {Number(rec.amount_due).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${rec.payment_status}`} style={{ fontSize: "10.5px" }}>
                            {rec.payment_status}
                          </span>
                        </td>
                        <td>
                          {rec.payment_status !== "paid" ? (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: "3px 10px", fontSize: "11.5px" }}
                              onClick={() => setSelectedFeeForPayment(rec)}
                            >
                              Collect
                            </button>
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--color-success)", fontWeight: 700 }}>
                              {rec.payment_method?.toUpperCase()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attendance History Section */}
          <div>
            <h4 style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontWeight: 800 }}>
              <Clock size={17} color="var(--primary)" />
              Recent Entrance Check-ins ({attendance.length})
            </h4>

            {attendance.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "14px 16px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                No entrance scans recorded yet for this member.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {attendance.map((att) => (
                  <div
                    key={att.id}
                    style={{
                      padding: "10px 14px",
                      background: "var(--bg-surface)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle2 size={16} color="#10B981" />
                      <span>{new Date(att.check_in_time).toLocaleString()}</span>
                    </div>
                    <span className="badge badge-active" style={{ fontSize: "11px" }}>
                      {att.check_in_method}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(drawerContent, document.body)}
      {selectedFeeForPayment && (
        <PaymentModal
          feeRecord={selectedFeeForPayment}
          memberName={member.full_name}
          onClose={() => setSelectedFeeForPayment(null)}
          onSuccess={() => {
            fetchDetails();
            onRefresh && onRefresh();
          }}
        />
      )}
    </>
  );
};
