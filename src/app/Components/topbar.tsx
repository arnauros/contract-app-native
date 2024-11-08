"use client";

import Button from "./button";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useParams } from "next/navigation";

interface TopbarProps {
  pathname: string;
}

export default function Topbar({ pathname }: TopbarProps) {
  const params = useParams();

  const getBreadcrumb = () => {
    if (pathname.startsWith("/Contracts/") && params.id) {
      return `Dashboard / Contracts / #${params.id}`;
    }
    if (pathname === "/New") {
      return "Dashboard / Contracts / New Contract";
    }
    return "Dashboard / Contracts";
  };

  const renderContent = () => {
    if (pathname.startsWith("/Contracts/")) {
      return (
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1 bg-green-100 rounded-md px-2 py-1">
            <span>1</span>
            <span>Draft & Edit</span>
          </div>
          <div className="flex items-center gap-1">
            <span>2</span>
            <span>Sign</span>
          </div>
          <div className="flex items-center gap-1">
            <span>3</span>
            <span>Send</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-[464px] h-[40px] px-3 py-2 gap-3 border border-gray-200 rounded-lg bg-white">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search"
          className="flex-1 bg-transparent border-0 focus:outline-none"
        />
        <span className="bg-gray-100 px-2 py-1 rounded">⌘ K</span>
      </div>
    );
  };

  return (
    <header className="relative bg-gray-100 border-b border-gray-300">
      <div className="flex items-center justify-between h-14 px-4">
        <img
          alt="Your Company"
          src="https://tailwindui.com/plus/img/logos/mark.svg?color=blue&shade=600"
          className="h-8 w-auto"
        />
        {pathname.startsWith("/Contracts/") && (
          <span className="text-gray-500 mx-4">{getBreadcrumb()}</span>
        )}
        <div className="flex-1 flex justify-center">{renderContent()}</div>
        {pathname.startsWith("/Contracts/") && (
          <Button className="ml-4">Next</Button>
        )}
      </div>
    </header>
  );
}
