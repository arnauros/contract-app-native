"use client";

import { useAuth } from "@/lib/context/AuthContext";
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
  FiMenu,
} from "react-icons/fi";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/firebase/auth";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  shortcut?: string;
}

const topNavigation: NavItem[] = [
  { name: "New Doc", href: "/New", icon: FiPlus, shortcut: "⌘N" },
  { name: "Recent", href: "/Recent", icon: FiClock, shortcut: "⌘R" },
  { name: "Search", href: "/Search", icon: FiSearch, shortcut: "⌘S" },
];

const workNavigation: NavItem[] = [
  { name: "Analytics", href: "/Analytics", icon: FiPieChart },
  { name: "People", href: "/People", icon: FiUsers },
  { name: "Incomes", href: "/Incomes", icon: FiDollarSign },
  { name: "Payments", href: "/Payments", icon: FiCreditCard },
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
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Header */}
        <div
          className={classNames(
            "p-4 flex items-center",
            isCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
            <FiFileText className="w-5 h-5 text-gray-600" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-medium truncate">Docs</div>
              <div className="text-sm text-gray-500 truncate">
                {user?.email}
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`absolute ${
              isCollapsed ? "right-[-12px]" : "right-[-12px]"
            } top-4 bg-white p-2 rounded-md hover:bg-gray-50 border border-gray-200`}
            title="Toggle Sidebar"
          >
            <FiMenu className="w-5 h-5 text-gray-600" />
          </button>
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
          {/* Add logout button if user is logged in */}
          {user && (
            <button
              onClick={handleLogout}
              className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Log Out
            </button>
          )}
          <div
            className={classNames(
              "space-y-3",
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
