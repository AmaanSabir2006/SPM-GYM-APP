import React, { useState } from "react";
import { X, Check, Banknote, Smartphone, Building2 } from "lucide-react";
import confetti from "canvas-confetti";
import API from "../api/client";
import { useToast } from "../context/ToastContext";

export const PaymentModal = ({ feeRecord, memberName, onClose, onSuccess }) => {
  const [amountPaid, setAmountPaid] = useState(feeRecord?.amount_due || "");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!feeRecord) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await API.post(`/fees/records/${feeRecord.id}/mark-paid`, {
        amount_paid: parseFloat(amountPaid),
        payment_method: paymentMethod,
        paid_date: paidDate,
      });

      // Trigger celebration confetti
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#10B981", "#E11D48", "#F59E0B"],
      });

      showToast(`Payment of Rs. ${parseFloat(amountPaid).toLocaleString()} recorded successfully!`, "success");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to record payment.", "error");
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "easypaisa", label: "EasyPaisa", icon: Smartphone },
    { id: "jazzcash", label: "JazzCash", icon: Smartphone },
    { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: "18px" }}>Record Fee Payment</h3>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {memberName || "Member"} • Due: Rs. {Number(feeRecord.amount_due).toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Amount Paid (PKR)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                required
                min="1"
                placeholder="Enter amount"
                style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-success)" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Channel</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                }}
              >
                {methods.map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "12px",
                        borderRadius: "var(--radius-sm)",
                        background: isSelected ? "var(--primary-light)" : "var(--bg-surface)",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-subtle)",
                        color: isSelected ? "var(--text-main)" : "var(--text-muted)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "13.5px",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon size={18} color={isSelected ? "var(--primary)" : "var(--text-dim)"} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input
                type="date"
                className="form-input"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} />
              {loading ? "Recording..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
