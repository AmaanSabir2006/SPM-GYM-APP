import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Plus, Calendar, Building, Zap, Users, Wrench, Package, HelpCircle, Receipt } from "lucide-react";
import API from "../api/client";
import { useToast } from "../context/ToastContext";

export const ExpenseDrawer = ({ onClose, onRefresh, onOpenAddModal }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await API.get("/expenses");
      setExpenses(res.data);
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete expense "${title}"?`)) return;
    try {
      await API.delete(`/expenses/${id}`);
      showToast("Expense deleted successfully.", "info");
      fetchExpenses();
      onRefresh && onRefresh();
    } catch (err) {
      showToast("Failed to delete expense.", "error");
    }
  };

  const totalAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "rent": return <Building size={14} />;
      case "utilities": return <Zap size={14} />;
      case "salary": return <Users size={14} />;
      case "maintenance": return <Wrench size={14} />;
      case "supplies": return <Package size={14} />;
      default: return <HelpCircle size={14} />;
    }
  };

  const drawerContent = (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h3 style={{ fontSize: "19px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, margin: 0 }}>
              <Receipt size={20} color="var(--primary)" />
              Gym Operational Expenses
            </h3>
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "4px" }}>
              Total Logged: Rs. {totalAmount.toLocaleString()}
            </div>
          </div>
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

        {/* Quick Add Bar */}
        <div
          style={{
            padding: "12px 24px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)" }}>
            {expenses.length} Records Found
          </span>
          <button className="btn btn-primary btn-sm" onClick={onOpenAddModal}>
            <Plus size={15} />
            Log New Expense
          </button>
        </div>

        {/* Table Body */}
        <div className="drawer-content">
          {expenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13.5px" }}>
              No expenses recorded yet. Add your rent, electricity, or salary expenses.
            </div>
          ) : (
            <div className="table-container" style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
              <table className="custom-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Title & Category</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--text-main)" }}>
                          {exp.title}
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-dim)", textTransform: "capitalize", marginTop: "2px" }}>
                          {getCategoryIcon(exp.category)}
                          {exp.category}
                        </div>
                      </td>
                      <td style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                        {new Date(exp.expense_date).toLocaleDateString()}
                      </td>
                      <td style={{ fontWeight: 800, color: "var(--color-danger)", fontSize: "14px", fontFamily: "var(--font-athletic)" }}>
                        Rs. {Number(exp.amount).toLocaleString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(exp.id, exp.title)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-dim)",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          title="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
