"use client";

import { FadeDiv } from "./Fade";

export function SolarAnalytics() {
  return (
    <section aria-label="analytics" className="mx-auto max-w-6xl">
      <div className="rounded-2xl bg-gradient-to-b from-green-50 to-white p-8 shadow-sm sm:p-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Advanced Solar Analytics
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Gain deep insights into your solar performance with our
              comprehensive analytics platform. Monitor production, efficiency,
              and savings in real-time.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {metrics.map((metric) => (
                <FadeDiv
                  key={metric.label}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-1 text-sm font-medium text-gray-500">
                    {metric.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {metric.value}
                    </div>
                    <div
                      className={`text-sm ${
                        metric.trend === "up"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {metric.trend === "up" ? "↑" : "↓"} {metric.change}
                    </div>
                  </div>
                </FadeDiv>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between border-b pb-2">
                  <div className="text-lg font-medium text-gray-900">
                    Energy Production
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      Daily
                    </span>
                    <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-600">
                      Monthly
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      Yearly
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex h-full items-end justify-between gap-1 px-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center"
                      >
                        <div
                          className="w-full bg-orange-400"
                          style={{
                            height: `${
                              30 +
                              Math.floor(Math.random() * 50) +
                              (i === 6 ? 10 : 0)
                            }%`,
                          }}
                        ></div>
                        <div className="mt-1 text-xs text-gray-500">
                          {
                            [
                              "J",
                              "F",
                              "M",
                              "A",
                              "M",
                              "J",
                              "J",
                              "A",
                              "S",
                              "O",
                              "N",
                              "D",
                            ][i]
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-green-100 sm:h-40 sm:w-40"></div>
            <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-full bg-green-200 sm:h-32 sm:w-32"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

const metrics = [
  {
    label: "Today's Production",
    value: "42.5 kWh",
    trend: "up",
    change: "12%",
  },
  {
    label: "Monthly Average",
    value: "38.7 kWh",
    trend: "up",
    change: "8%",
  },
  {
    label: "Efficiency Rate",
    value: "97.3%",
    trend: "up",
    change: "2.1%",
  },
  {
    label: "CO₂ Saved",
    value: "1.2 tons",
    trend: "up",
    change: "15%",
  },
];
