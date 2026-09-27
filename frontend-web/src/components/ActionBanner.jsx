import React from "react";
import { AlertTriangle, ArrowRight, MessageCircle } from "lucide-react";

export const ActionBanner = ({ alertsData, onAction }) => {
  if (!alertsData || alertsData.total_alerts === 0) return null;

  const { due_today_count, overdue_count, total_alerts } = alertsData;

  return (
    <div className="action-banner">
      <div className="banner-left">
        <div className="banner-icon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <div className="banner-title">
            Fee Collection Attention Required: {total_alerts} Pending Member Dues
          </div>
          <div className="banner-sub">
            {overdue_count > 0 && `${overdue_count} overdue payment${overdue_count > 1 ? "s" : ""}`}
            {overdue_count > 0 && due_today_count > 0 && " and "}
            {due_today_count > 0 && `${due_today_count} due today`}. Send 1-tap WhatsApp reminders to speed up cash flow.
          </div>
        </div>
      </div>
      <button className="btn btn-whatsapp btn-sm" onClick={onAction}>
        <MessageCircle size={15} />
        Review WhatsApp Queue
        <ArrowRight size={14} />
      </button>
    </div>
  );
};
