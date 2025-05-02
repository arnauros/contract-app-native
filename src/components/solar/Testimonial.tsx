"use client";

import Image from "next/image";
import { FadeDiv } from "./Fade";

export default function Testimonial() {
  return (
    <section aria-label="testimonial" className="mx-auto max-w-6xl">
      <FadeDiv className="rounded-2xl bg-gradient-to-b from-blue-50 to-white p-8 shadow-sm sm:p-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              "The solar system has transformed our farm operations, reducing
              energy costs by 75% and providing reliable power even during
              outages."
            </h2>

            <div className="mt-6">
              <div className="flex items-center">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full w-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                </div>
                <div className="ml-4">
                  <div className="font-medium text-gray-900">Sarah Johnson</div>
                  <div className="text-gray-600">Owner, Green Valley Farms</div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg">
                  <div className="aspect-square w-full bg-orange-100"></div>
                </div>
                <div className="overflow-hidden rounded-lg">
                  <div className="aspect-square w-full bg-orange-200"></div>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="overflow-hidden rounded-lg">
                  <div className="aspect-square w-full bg-orange-200"></div>
                </div>
                <div className="overflow-hidden rounded-lg">
                  <div className="aspect-square w-full bg-orange-100"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeDiv>
    </section>
  );
}
