"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import ScrollReveal from "./ScrollReveal";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Freelance Designer",
    company: "DesignHub",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    quote:
      "This platform has completely transformed how I handle contracts with clients. What used to take days now takes minutes, and the professional templates give my business a polished look.",
  },
  {
    name: "Michael Chen",
    role: "Web Developer",
    company: "CodeCraft Solutions",
    image:
      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    quote:
      "The AI-powered contract generation saved me countless hours of research and legal consultation. I can now focus on coding instead of worrying about contract terms.",
  },
  {
    name: "Emily Rodriguez",
    role: "Marketing Consultant",
    company: "Growth Strategies",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    quote:
      "The digital signature feature has been a game-changer for my consulting business. My clients love how easy it is to review and sign contracts remotely.",
  },
  {
    name: "David Wilson",
    role: "Content Creator",
    company: "Media Matters",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    quote:
      "As someone who works with multiple clients, keeping track of contracts was a nightmare. This platform organizes everything beautifully and the revision history is invaluable.",
  },
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length
    );
  };

  // Auto-rotate testimonials
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      nextTestimonial();
    }, 8000); // Change testimonial every 8 seconds

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex]);

  // Animate testimonial change
  useEffect(() => {
    if (!sliderRef.current) return;

    const testimonialElements =
      sliderRef.current.querySelectorAll(".testimonial-item");

    gsap.to(testimonialElements, {
      opacity: 0,
      x: -20,
      duration: 0.3,
      stagger: 0.1,
      onComplete: () => {
        gsap.fromTo(
          testimonialElements,
          { opacity: 0, x: 20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.1,
            delay: 0.1,
          }
        );
      },
    });
  }, [currentIndex]);

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of freelancers and businesses who have simplified
              their contract process.
            </p>
          </div>
        </ScrollReveal>

        <div className="relative max-w-4xl mx-auto">
          {/* Testimonial slider */}
          <div
            ref={sliderRef}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100"
          >
            <div className="testimonial-item">
              <div className="flex items-center mb-8">
                <img
                  src={testimonials[currentIndex].image}
                  alt={testimonials[currentIndex].name}
                  className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-blue-100"
                />
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {testimonials[currentIndex].name}
                  </h3>
                  <p className="text-gray-600">
                    {testimonials[currentIndex].role},{" "}
                    <span className="text-blue-600">
                      {testimonials[currentIndex].company}
                    </span>
                  </p>
                </div>
              </div>

              <div className="relative">
                <svg
                  className="absolute -top-6 -left-6 h-12 w-12 text-blue-100 transform -rotate-180"
                  fill="currentColor"
                  viewBox="0 0 32 32"
                >
                  <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                </svg>
                <p className="text-gray-700 text-lg italic relative z-10">
                  "{testimonials[currentIndex].quote}"
                </p>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-10">
              <button
                onClick={prevTestimonial}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Dots indicator */}
              <div className="flex items-center space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex ? "bg-blue-600 w-6" : "bg-gray-300"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={nextTestimonial}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
