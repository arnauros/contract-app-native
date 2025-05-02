import React from "react";

interface StatItem {
  name: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
}

const defaultStats: StatItem[] = [
  {
    name: "Total revenue",
    value: "$405,091.00",
    change: "+4.5%",
    changeType: "positive",
  },
  {
    name: "Overdue invoices",
    value: "$12,787.00",
    change: "+54.0%",
    changeType: "negative",
  },
  {
    name: "Outstanding invoices",
    value: "$245,988.00",
    change: "-1.4%",
    changeType: "positive",
  },
  {
    name: "Expenses",
    value: "$30,156.00",
    change: "+10.2%",
    changeType: "negative",
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface DashboardStatsProps {
  stats?: StatItem[];
}

export default function DashboardStats({
  stats = defaultStats,
}: DashboardStatsProps) {
  return (
    <div className="rounded-lg overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex flex-col">
              <dt className="text-sm font-medium text-gray-500 mb-1">
                {stat.name}
              </dt>
              <dd className="text-3xl font-medium tracking-tight text-gray-900 mb-2">
                {stat.value}
              </dd>
              <dd
                className={classNames(
                  stat.changeType === "negative"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-green-50 text-emerald-600",
                  "text-xs font-medium self-start px-2 py-0.5 rounded-full inline-flex items-center"
                )}
              >
                {stat.change}{" "}
                <span className="text-gray-500 ml-1 font-normal">
                  from last week
                </span>
              </dd>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
