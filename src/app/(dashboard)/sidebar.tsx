"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useSidebar } from "@/lib/context/SidebarContext";
import {
  FiFileText,
  FiPlus,
  FiClock,
  FiSearch,
  FiPieChart,
  FiUsers,
  FiDollarSign,
  FiCreditCard,
  FiSettings,
  FiHelpCircle,
  FiChevronDown,
  FiChevronLeft,
  FiHome,
  FiUser,
  FiLogOut,
  FiPlusCircle,
  FiInbox,
  FiMenu,
  FiX,
} from "react-icons/fi";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut } from "@/lib/firebase/authUtils";
import Image from "next/image";
import { toast } from "react-hot-toast";
import useOnClickOutside from "@/lib/hooks/useOnClickOutside";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  shortcut?: string;
}

const topNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: FiHome, shortcut: "⌘D" },
  { name: "New Doc", href: "/new", icon: FiPlus, shortcut: "⌘N" },
  {
    name: "Recent",
    href: "/recent",
    icon: FiClock,
    shortcut: "⌘R",
  },
  {
    name: "Search",
    href: "/search",
    icon: FiSearch,
    shortcut: "⌘S",
  },
];

const workNavigation: NavItem[] = [
  { name: "Analytics", href: "/analytics", icon: FiPieChart },
  { name: "People", href: "/people", icon: FiUsers },
  { name: "Incomes", href: "/incomes", icon: FiDollarSign },
  { name: "Payments", href: "/payments", icon: FiCreditCard },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const { user } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const [workExpanded, setWorkExpanded] = useState(true);

  // Add logout handler
  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="h-full">
      <div
        className={`sticky top-0 h-screen flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Header with Logo */}
        <div
          className={classNames(
            "p-3 flex items-center",
            isCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 h-8 w-8">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-medium text-sm">MacuDocs</div>
              <div className="text-xs text-gray-500">Your workspace</div>
            </div>
          )}
        </div>

        {/* Main navigation */}
        <nav
          className={classNames(
            "flex-1 overflow-y-auto",
            isCollapsed ? "px-2" : "px-3"
          )}
        >
          {/* Top actions */}
          {topNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={classNames(
                pathname === item.href
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50",
                "group flex items-center gap-3 rounded-md my-1",
                isCollapsed ? "justify-center p-2" : "px-3 py-2"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {item.shortcut && (
                    <span className="text-xs text-gray-400">
                      {item.shortcut}
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}

          {/* Work section */}
          <div className="mt-8">
            <div
              className={classNames(
                "flex items-center text-xs font-semibold text-gray-500",
                isCollapsed ? "justify-center py-2" : "px-3 py-2"
              )}
            >
              <span>WORK</span>
              {!isCollapsed && (
                <button
                  onClick={() => setWorkExpanded(!workExpanded)}
                  className="ml-auto"
                >
                  <FiChevronDown
                    className={classNames(
                      "w-4 h-4 transition-transform",
                      workExpanded ? "transform rotate-180" : ""
                    )}
                  />
                </button>
              )}
            </div>
            {(workExpanded || isCollapsed) && (
              <div className={isCollapsed ? "" : "mt-1"}>
                {workNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={classNames(
                      pathname === item.href
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50",
                      "group flex items-center gap-3 rounded-md my-1",
                      isCollapsed ? "justify-center p-2" : "px-3 py-2"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1">{item.name}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Personal section */}
          <div className="mt-4">
            <div
              className={classNames(
                "text-xs font-semibold text-gray-500",
                isCollapsed ? "text-center py-2" : "px-3 py-2"
              )}
            >
              PERSONAL
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div
          className={classNames(
            "border-t border-gray-200",
            isCollapsed ? "p-2" : "p-4"
          )}
        >
          {/* Toggle sidebar button now in footer */}
          <button
            onClick={toggleSidebar}
            className={classNames(
              "w-full mb-3 py-2 border border-gray-200 rounded-md flex items-center justify-center",
              isCollapsed ? "px-2" : "px-3"
            )}
            title="Toggle Sidebar"
          >
            <FiChevronLeft
              className={classNames(
                "w-5 h-5 text-gray-600 transition-transform",
                isCollapsed ? "transform rotate-180" : ""
              )}
            />
            {!isCollapsed && <span className="ml-2">Collapse</span>}
          </button>

          <div
            className={classNames(
              "flex items-center",
              isCollapsed ? "flex-col gap-2" : "justify-between mb-4"
            )}
          >
            {!isCollapsed && (
              <div className="text-sm text-gray-600">1.25 / 5 GB</div>
            )}
            <Link
              href="/upgrade"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {isCollapsed ? "↑" : "Upgrade"}
            </Link>
          </div>

          {/* User email above logout */}
          {user && !isCollapsed && (
            <div className="flex items-center gap-2 mb-2 py-2 border-t border-gray-100 pt-2">
              <FiUser className="w-4 h-4 text-gray-500" />
              <div className="text-sm text-gray-700 truncate">{user.email}</div>
            </div>
          )}

          <div
            className={classNames(
              "space-y-3 mt-3",
              isCollapsed ? "flex flex-col items-center gap-2" : ""
            )}
          >
            <Link
              href="/help"
              className={classNames(
                "flex items-center gap-3 text-gray-700 hover:text-gray-900",
                isCollapsed ? "justify-center p-2" : "text-sm"
              )}
              title={isCollapsed ? "Help" : undefined}
            >
              <FiHelpCircle className="w-5 h-5" />
              {!isCollapsed && "Help"}
            </Link>
            <Link
              href="/settings"
              className={classNames(
                "flex items-center gap-3 text-gray-700 hover:text-gray-900",
                isCollapsed ? "justify-center p-2" : "text-sm"
              )}
              title={isCollapsed ? "Settings" : undefined}
            >
              <FiSettings className="w-5 h-5" />
              {!isCollapsed && "Settings"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
