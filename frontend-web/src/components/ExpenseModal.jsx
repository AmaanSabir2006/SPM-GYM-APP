import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, DollarSign, Building, Zap, Users, Wrench, Package, HelpCircle } from "lucide-react";
import API from "../api/client";
import { useToast } from "../context/ToastContext";

export const ExpenseModal = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("utilities");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const categories = [
    { id: "rent", label: "Facility Rent", icon: Building },
    { id: "utilities", label: "Electricity / Bills", icon: Zap },
    { id: "salary", label: "Trainer Salary", icon: Users },
    { id: "maintenance", label: "Equipment Service", icon: Wrench },
    { id: "supplies", label: "Supplements/Supplies", icon: Package },
    { id: "other", label: "Other Expense", icon: HelpCircle },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await API.post("/expenses", {
        title,
        category,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        notes: notes || null,
      });

      showToast(`Expense of Rs. ${parseFloat(amount).toLocaleString()} logged!`, "success");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to log expense.", "error");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Log Gym Expense</h3>
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1.4 }}>
              Record rent, electric bills, salaries, or equipment repair for Net Profit calculation.
            </div>
          </div>
          <button
            type="button"
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
              flexShrink: 0,
            }}
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Expense Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. October Gym Rent, K-Electric Bill, Cable Pulley Repair"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                }}
              >
                {categories.map((c) => {
                  const Icon = c.icon;
                  const isSelected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: isSelected ? "var(--primary-light)" : "var(--bg-surface)",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-subtle)",
                        color: isSelected ? "var(--text-main)" : "var(--text-muted)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "12.5px",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon size={16} color={isSelected ? "var(--primary)" : "var(--text-dim)"} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Amount (PKR)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="35000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                  style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-danger)" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expense Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes / Reference (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Paid via bank transfer / receipt #128"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} />
              {loading ? "Recording..." : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
