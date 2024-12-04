"use client";

import {
  PlusIcon,
  ClipboardIcon,
  CurrencyDollarIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Navigation items for the sidebar
const navigation = [
  {
    name: "Create",
    href: "/Contracts/New/",
    icon: PlusIcon,
  },
  { name: "Contracts", href: "/Contracts", icon: ClipboardIcon },
  { name: "Invoice", href: "/Invoice", icon: CurrencyDollarIcon },
  { name: "Proposals", href: "/Proposals", icon: PaperAirplaneIcon },
];

// Utility function to join class names conditionally
function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center gap-y-5 overflow-y-visible border-r border-gray-200 bg-gray-100 px-2 pt-[5rem] w-16 relative">
      <nav className="flex flex-1 flex-col items-center space-y-4">
        {/* Navigation section */}
        <ul role="list" className="flex flex-col space-y-4">
          {navigation.map((item) => {
            // Check if the current route matches the item's href
            const isActive = pathname === item.href;

            return (
              <li key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className={classNames(
                    isActive
                      ? "bg-gray-50 text-gray-600 ring-2 ring-gray-400"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 hover:shadow-lg focus:bg-gray-50 focus:text-gray-600 focus:shadow-lg active:bg-gray-50 active:text-gray-600",
                    "flex justify-center p-2 rounded-lg transition-colors duration-200 ease-in-out"
                  )}
                >
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </Link>
                {/* Tooltip */}
                <div className="absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 z-50 pointer-events-none">
                  {item.name}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
