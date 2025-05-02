"use client";

import { FadeDiv } from "./Fade";

export function Map() {
  return (
    <section aria-label="map" className="mx-auto max-w-6xl">
      <div className="text-center">
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
          Coverage
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          National Solar Coverage
        </h2>
        <p className="mt-3 text-lg text-gray-600 sm:mt-4">
          Serving farms and agricultural operations across the country
        </p>
      </div>

      <FadeDiv className="mt-12">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-white p-4 shadow-sm sm:p-6">
          <div className="aspect-[16/9] w-full rounded-lg bg-gray-100 p-2">
            {/* Simplified map representation */}
            <div className="h-full w-full rounded bg-white p-4">
              <div className="h-full w-full rounded bg-gray-50 flex items-center justify-center">
                <div className="grid grid-cols-5 grid-rows-3 gap-2 h-full w-full p-4">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded ${
                        [2, 5, 7, 8, 11, 12].includes(i)
                          ? "bg-orange-400"
                          : "bg-gray-200"
                      } opacity-${Math.floor(Math.random() * 3) + 7}0`}
                    />
                  ))}
                </div>

                <div className="absolute flex flex-col items-center">
                  <span className="font-medium text-lg text-gray-600">
                    Interactive Map
                  </span>
                  <span className="text-sm text-gray-500">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-gray-100 bg-white p-4 text-center shadow-sm"
              >
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeDiv>
    </section>
  );
}

const stats = [
  { value: "27", label: "States Covered" },
  { value: "1,250+", label: "Farms Powered" },
  { value: "98%", label: "Customer Satisfaction" },
  { value: "24/7", label: "Support Available" },
];
