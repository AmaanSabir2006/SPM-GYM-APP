import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, Save, Phone, Calendar, DollarSign, ShieldAlert, Trash2 } from "lucide-react";
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
    setFormData((prev) => ({
      ...prev,
      [name]: name === "monthly_fee" || name === "billing_cycle_day" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = (formData.phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      showToast("Please enter a valid athlete mobile or WhatsApp number (minimum 10 digits).", "error");
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
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              {isEditing ? "Edit Member Profile" : "Enroll New Gym Member"}
            </h3>
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1.4 }}>
              {isEditing ? "Update membership details and fees" : "Add member to tenant roster and billing engine"}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Phone Number (WhatsApp)</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Unique to athlete</span>
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
                  Cannot be the gym owner or staff phone number.
                </div>
              </div>

              <div className="form-group">
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Monthly Membership Fee (PKR)</label>
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

              <div className="form-group">
                <label className="form-label">Billing Cycle Day</label>
                <input
                  type="number"
                  name="billing_cycle_day"
                  className="form-input"
                  placeholder="1"
                  value={formData.billing_cycle_day}
                  onChange={handleChange}
                  required
                  min="1"
                  max="28"
                  title="Day of month when fee renews (1 to 28)"
                />
              </div>
            </div>

            {isEditing && (
              <div className="form-group">
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

          <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
