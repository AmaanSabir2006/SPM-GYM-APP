import React, { useState, useEffect } from "react";
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
  const whatsappUrl = `https://wa.me/${phone}`;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ justifyContent: "flex-end", padding: 0 }}>
        <div
          style={{
            width: "560px",
            maxWidth: "100vw",
            height: "100vh",
            background: "var(--bg-card)",
            borderLeft: "1px solid var(--border-medium)",
            boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            animation: "slide-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header" style={{ borderBottom: "1px solid var(--border-subtle)", padding: "20px 24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ fontSize: "20px" }}>{member.full_name}</h3>
                <span className={`badge badge-${member.status}`}>
                  {member.status}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "3px" }}>
                Member since {new Date(member.join_date).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  padding: "4px 10px",
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
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Quick Info Bar */}
          <div
            style={{
              padding: "16px 24px",
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              fontSize: "13px",
            }}
          >
            <div>
              <div style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Monthly Fee</div>
              <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "16px" }}>
                Rs. {Number(member.monthly_fee).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Billing Day</div>
              <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                {member.billing_cycle_day}th of month
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>WhatsApp</div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-whatsapp)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <MessageCircle size={14} />
                {member.phone}
              </a>
            </div>
          </div>

          {/* Scrollable Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {/* Fee Ledger Section */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <h4 style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Receipt size={17} color="var(--primary)" />
                  Payment Ledger History ({ledger.length})
                </h4>
              </div>

              {ledger.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "12px 0" }}>
                  No fee records generated yet.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
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
                          <td>{new Date(rec.due_date).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 600 }}>Rs. {Number(rec.amount_due).toLocaleString()}</td>
                          <td>
                            <span className={`badge badge-${rec.payment_status}`}>
                              {rec.payment_status}
                            </span>
                          </td>
                          <td>
                            {rec.payment_status !== "paid" ? (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: "3px 8px", fontSize: "11.5px" }}
                                onClick={() => setSelectedFeeForPayment(rec)}
                              >
                                Collect
                              </button>
                            ) : (
                              <span style={{ fontSize: "12px", color: "var(--color-success)" }}>
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
              <h4 style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Clock size={17} color="#60A5FA" />
                Recent Entrance Check-ins ({attendance.length})
              </h4>

              {attendance.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "12px 0" }}>
                  No entrance scans recorded yet.
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
