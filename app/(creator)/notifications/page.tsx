"use client";

import { Briefcase, MessageCircle, Mail, Bell } from "lucide-react";

const NOTIFICATIONS = [
  {
    id: 1,
    unread: true,
    icon: Briefcase,
    iconColor: "#e4dcd1",
    title: "New Campaign Available",
    description: "Kaleidos Summer Collection is now live",
    time: "2m ago",
  },
  {
    id: 2,
    unread: true,
    icon: MessageCircle,
    iconColor: "#e4dcd1",
    title: "New Comment",
    description: "Sophie Chen commented on FW Beauty Gifting",
    time: "1h ago",
  },
  {
    id: 3,
    unread: false,
    icon: Mail,
    iconColor: "#e4dcd1",
    title: "New Message from WGY",
    description: "Hey! We are hosting a WGY x Sculpted...",
    time: "3h ago",
  },
  {
    id: 4,
    unread: false,
    icon: Briefcase,
    iconColor: "#706b6b",
    title: "New Campaign Available",
    description: "Nature Spell Hair Oil Campaign is now live",
    time: "2d ago",
  },
];

export default function NotificationsPage() {
  const hasNotifications = NOTIFICATIONS.length > 0;

  return (
    <div>
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-page-heading text-white">
          Notifications
        </h1>
      </div>

      {hasNotifications ? (
        <div>
          {NOTIFICATIONS.map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={n.id}>
                <div
                  className="flex gap-3 px-5 py-[14px]"
                  style={{
                    background: "#222222",
                    borderLeft: n.unread ? "2px solid #e4dcd1" : "2px solid transparent",
                  }}
                >
                  {/* Icon circle */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
                    style={{ background: "#2a2a2a" }}
                  >
                    <Icon size={16} color={n.iconColor} strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-montserrat font-semibold text-white"
                      style={{ fontSize: "13px" }}
                    >
                      {n.title}
                    </p>
                    <p
                      className="font-montserrat font-normal mt-[2px]"
                      style={{ fontSize: "12px", color: "#706b6b" }}
                    >
                      {n.description}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span
                    className="font-montserrat font-normal flex-none"
                    style={{ fontSize: "10px", color: "#706b6b" }}
                  >
                    {n.time}
                  </span>
                </div>

                {/* Divider between rows */}
                {i < NOTIFICATIONS.length - 1 && (
                  <div
                    className="mx-5"
                    style={{ height: "1px", background: "rgba(255,255,255,0.04)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center" style={{ padding: "60px 20px" }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#2a2a2a",
            }}
          >
            <Bell size={28} color="#706b6b" strokeWidth={1.5} />
          </div>
          <p
            className="font-playfair italic font-normal text-white text-center"
            style={{ fontSize: "18px", marginTop: "16px" }}
          >
            No notifications yet
          </p>
          <p
            className="font-montserrat font-normal text-center"
            style={{ fontSize: "13px", color: "#706b6b", marginTop: "6px" }}
          >
            You are all caught up!
          </p>
        </div>
      )}
    </div>
  );
}
