"use client";

import Link from "next/link";

export default function TestSignaturePage() {
  const testPages = [
    {
      title: "Simple Logic Test",
      description:
        "Basic signature logic testing with pure localStorage operations - guaranteed to work",
      href: "/test-signature-simple",
      features: [
        "No external dependencies",
        "Pure localStorage testing",
        "Core signature logic",
        "Event system testing",
        "Fast and reliable",
        "Always passes when logic is correct",
      ],
      color: "green",
    },
    {
      title: "Mock System Test",
      description:
        "LocalStorage-based testing without Firestore dependencies - works offline",
      href: "/test-signature-mock",
      features: [
        "No authentication required",
        "No Firestore dependencies",
        "Full signature logic testing",
        "Cache functionality testing",
        "Event system validation",
        "LocalStorage operations",
      ],
      color: "blue",
    },
    {
      title: "Complete System Test",
      description:
        "Comprehensive automated test suite with real Firestore operations (requires authentication)",
      href: "/test-signature-system",
      features: [
        "Automated test execution",
        "Cache functionality testing",
        "Signature operations testing",
        "Event system validation",
        "Error handling verification",
        "Performance metrics",
      ],
      color: "blue",
    },
    {
      title: "Component Testing",
      description:
        "Interactive testing interface for individual components and hooks",
      href: "/test-signature-components",
      features: [
        "Hook testing interface",
        "Event simulation",
        "Manual signature operations",
        "Real-time state monitoring",
        "LocalStorage inspection",
        "Component interaction testing",
      ],
      color: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Signature System Test Suite
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Comprehensive testing tools for the unified signature management
            system
          </p>
          <p className="text-gray-500">
            Test all possibilities and edge cases to ensure robust functionality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testPages.map((page, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-sm border-l-4 border-${page.color}-500 p-6 hover:shadow-md transition-shadow`}
            >
              <div className="mb-4">
                <h2
                  className={`text-2xl font-semibold text-${page.color}-600 mb-2`}
                >
                  {page.title}
                </h2>
                <p className="text-gray-600">{page.description}</p>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-2">Features:</h3>
                <ul className="space-y-1">
                  {page.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="text-sm text-gray-600 flex items-center"
                    >
                      <svg
                        className="w-4 h-4 text-green-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={page.href}
                className={`inline-flex items-center px-4 py-2 bg-${page.color}-600 text-white rounded-lg hover:bg-${page.color}-700 transition-colors`}
              >
                <span>Open Test Page</span>
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What You Can Test
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">
                Core Functionality
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Signature state management</li>
                <li>• Edit permission logic</li>
                <li>• Cache system performance</li>
                <li>• LocalStorage synchronization</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Event System</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Cross-component communication</li>
                <li>• Real-time state updates</li>
                <li>• Event dispatching</li>
                <li>• Event listening</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Edge Cases</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Network error handling</li>
                <li>• Invalid data scenarios</li>
                <li>• Concurrent operations</li>
                <li>• Cache invalidation</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Testing Tips</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • Use the automated test suite first to verify basic
                  functionality
                </li>
                <li>
                  • Use the component test page to explore edge cases manually
                </li>
                <li>• Check the browser console for detailed logging</li>
                <li>• Monitor network requests in the Network tab</li>
                <li>• Test with different contract IDs to verify isolation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
