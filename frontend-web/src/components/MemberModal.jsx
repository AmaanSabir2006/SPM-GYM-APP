import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, Save, Phone, Calendar, DollarSign, ShieldAlert, Trash2, Check, Clock, Banknote, Smartphone, Building2 } from "lucide-react";
import API from "../api/client";
import { useToast } from "../context/ToastContext";
import { MemberWelcomeModal } from "./MemberWelcomeModal";

export const MemberModal = ({ member, onClose, onSuccess }) => {
  const isEditing = !!member;
  const { showToast } = useToast();
  const [createdMember, setCreatedMember] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    emergency_contact: "",
    monthly_fee: 4000,
    billing_cycle_day: 1,
    status: "active",
    initial_payment_status: "paid",
    initial_payment_method: "cash",
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently remove "${member.full_name}"?`)) return;
    setDeleting(true);
    try {
      await API.delete(`/members/${member.id}`);
      showToast(`Member "${member.full_name}" removed.`, "info");
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to remove member.", "error");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (member) {
      setFormData({
        full_name: member.full_name || "",
        phone: member.phone || "",
        emergency_contact: member.emergency_contact || "",
        monthly_fee: member.monthly_fee || 4000,
        billing_cycle_day: member.billing_cycle_day || 1,
        status: member.status || "active",
      });
    }
  }, [member]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "billing_cycle_day") {
      if (value === "") {
        setFormData((prev) => ({ ...prev, billing_cycle_day: "" }));
        return;
      }
      let num = parseInt(value, 10);
      if (isNaN(num)) return;
      if (num < 1) num = 1;
      if (num > 31) num = 31;
      setFormData((prev) => ({ ...prev, billing_cycle_day: num }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === "monthly_fee" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = (formData.phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast("Please enter a valid athlete mobile or WhatsApp number (minimum 10 digits).", "error");
      return;
    }

    const cycleDay = Number(formData.billing_cycle_day);
    if (!cycleDay || isNaN(cycleDay) || cycleDay < 1 || cycleDay > 31 || !Number.isInteger(cycleDay)) {
      showToast("Fee Due Day must be a valid day of the month between 1 and 31.", "error");
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        await API.put(`/members/${member.id}`, formData);
        showToast("Member profile updated successfully!", "success");
        onSuccess && onSuccess();
        onClose();
      } else {
        const res = await API.post("/members", formData);
        showToast("New member enrolled successfully!", "success");
        onSuccess && onSuccess(res.data);
        // Automatically open the WhatsApp pass sending box right at this point!
        setCreatedMember(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Operation failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // If a new member was just added, seamlessly show the pass sending box
  if (createdMember) {
    return (
      <MemberWelcomeModal
        memberId={createdMember.id}
        onClose={() => {
          setCreatedMember(null);
          onClose();
        }}
      />
    );
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "560px", 
          width: "95%", 
          maxHeight: "min(92vh, 670px)", 
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden" 
        }}
      >
        <div className="modal-header" style={{ flexShrink: 0, padding: "16px 22px" }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              {isEditing ? "Edit Member Profile" : "Enroll New Gym Member"}
            </h3>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1.4 }}>
              {isEditing ? "Update membership details and fees" : "Register a new member and set monthly membership dues"}
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div className="modal-body" style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "18px 22px" }}>
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="full_name"
                className="form-input"
                placeholder="e.g. Hamza Ali"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px", marginBottom: "14px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Phone Number (WhatsApp)</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Unique</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="03001234567"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Must be unique athlete mobile.
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Emergency Contact</label>
                <input
                  type="text"
                  name="emergency_contact"
                  className="form-input"
                  placeholder="03217654321"
                  value={formData.emergency_contact}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px", marginBottom: "14px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Monthly Fee (PKR)</label>
                <input
                  type="number"
                  name="monthly_fee"
                  className="form-input"
                  placeholder="4000"
                  value={formData.monthly_fee}
                  onChange={handleChange}
                  required
                  min="500"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Monthly Due Day</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Day 1 – 31</span>
                </label>
                <input
                  type="number"
                  name="billing_cycle_day"
                  className="form-input"
                  placeholder="1"
                  value={formData.billing_cycle_day}
                  onChange={handleChange}
                  required
                  min="1"
                  max="31"
                  step="1"
                  title="Day of month when fee renews (1 to 31)"
                />
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Auto-adjusts for shorter months (Feb/Sep).
                </div>
              </div>
            </div>

            {!isEditing && (
              <div 
                style={{ 
                  background: "var(--bg-surface)", 
                  border: "1px solid var(--border-subtle)", 
                  borderRadius: "var(--radius-md)", 
                  padding: "13px 15px",
                  marginTop: "4px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: "12.5px" }}>
                    First Month Fee Payment
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Initial Registration
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: formData.initial_payment_status === "paid" ? "12px" : "0" }}>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, initial_payment_status: "paid" }))}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: formData.initial_payment_status === "paid" ? "2px solid var(--color-success)" : "1px solid var(--border-subtle)",
                      background: formData.initial_payment_status === "paid" ? "var(--color-success-bg)" : "transparent",
                      color: formData.initial_payment_status === "paid" ? "var(--color-success)" : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Check size={14} />
                    <span>Paid at Counter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, initial_payment_status: "unpaid" }))}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: formData.initial_payment_status === "unpaid" ? "2px solid var(--color-warning)" : "1px solid var(--border-subtle)",
                      background: formData.initial_payment_status === "unpaid" ? "var(--color-warning-bg)" : "transparent",
                      color: formData.initial_payment_status === "unpaid" ? "var(--color-warning)" : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Clock size={14} />
                    <span>Due on Renewal Day</span>
                  </button>
                </div>

                {formData.initial_payment_status === "paid" && (
                  <div>
                    <label className="form-label" style={{ fontSize: "11px", marginBottom: "6px", color: "var(--text-muted)" }}>
                      Payment Method Collected
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px" }}>
                      {[
                        { id: "cash", label: "Cash", icon: Banknote },
                        { id: "easypaisa", label: "EasyPaisa", icon: Smartphone },
                        { id: "jazzcash", label: "JazzCash", icon: Smartphone },
                        { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
                      ].map((pm) => {
                        const Icon = pm.icon;
                        const isSelected = formData.initial_payment_method === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, initial_payment_method: pm.id }))}
                            style={{
                              padding: "7px 10px",
                              borderRadius: "var(--radius-sm)",
                              border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--border-subtle)",
                              background: isSelected ? "var(--primary-light, rgba(225, 29, 72, 0.12))" : "var(--bg-card)",
                              color: isSelected ? "var(--primary)" : "var(--text-muted)",
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: "11.5px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <Icon size={14} />
                            <span>{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isEditing && (
              <div className="form-group" style={{ marginTop: "12px", marginBottom: 0 }}>
                <label className="form-label">Membership Status</label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active (Access Allowed)</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended (Blocked at QR Entrance)</option>
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ flexShrink: 0, padding: "16px 22px", background: "transparent", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {isEditing ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDelete}
                disabled={deleting || loading}
                style={{
                  color: "var(--danger)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Trash2 size={15} />
                <span>{deleting ? "Removing..." : "Remove Member"}</span>
              </button>
            ) : <div />}

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || deleting}>
                {isEditing ? <Save size={16} /> : <UserPlus size={16} />}
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Enroll Member"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
