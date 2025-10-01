"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SuggestionPills } from "./SuggestionPills";

const placeholderExamples = [
  "I need a contract for a website development project with Talon...",
  "Help me create an invoice for my mobile app work...",
  "I'm building an e-commerce site for a client...",
  "Create a contract for my logo design services...",
  "I need to invoice for my consulting work...",
  "Help me write a contract for video production...",
  "I'm doing SEO work and need a contract...",
  "Create an agreement for my photography services...",
];

type HeroChatProps = {
  onSubmit?: (message: string, files: File[]) => void;
  hideSuggestions?: boolean;
  redirectOnSubmit?: boolean;
  initialMessage?: string;
  // Optional: when provided, we'll process files and return summaries
  onFilesProcessed?: (
    files: Array<{ file: File; summary?: string; type?: string }>
  ) => void;
  // Optional slot to render additional custom form fields under the textarea
  additionalFields?: React.ReactNode;
};

export function HeroChat({
  onSubmit,
  hideSuggestions = false,
  redirectOnSubmit = true,
  initialMessage = "",
  onFilesProcessed,
  additionalFields,
}: HeroChatProps) {
  const [message, setMessage] = useState(initialMessage);
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState<any[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter effect
  useEffect(() => {
    if (message) {
      setDisplayedText("");
      return;
    }

    const currentText = placeholderExamples[currentPlaceholder];
    let charIndex = 0;
    setDisplayedText("");
    setIsAnimating(true);

    // Clear any existing typewriter
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
    }

    // Typing effect
    const typeInterval = setInterval(() => {
      if (charIndex < currentText.length) {
        setDisplayedText(currentText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        // Wait a bit then start erasing
        setTimeout(() => {
          if (message) return; // Don't continue if user started typing

          // Erasing effect
          const eraseInterval = setInterval(() => {
            if (charIndex > 0) {
              charIndex--;
              setDisplayedText(currentText.slice(0, charIndex));
            } else {
              clearInterval(eraseInterval);
              setIsAnimating(false);
              // Move to next placeholder after a short pause
              setTimeout(() => {
                if (message) return; // Don't continue if user started typing
                setCurrentPlaceholder(
                  (prev) => (prev + 1) % placeholderExamples.length
                );
              }, 500);
            }
          }, 30); // Faster erase speed
        }, 2000); // Pause at full text for 2 seconds
      }
    }, 50); // Typing speed

    typewriterRef.current = typeInterval;

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, [currentPlaceholder, message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    // Check authentication on submit (only for homepage flow)
    if (!onSubmit) {
      if (!user) {
        toast.error("Sign up to create your first contract!");
        router.push("/signup");
        return;
      }
    }

    // If authenticated, start the contract creation process
    setIsTyping(true);

    // Dashboard integration path: call provided onSubmit callback
    if (onSubmit) {
      try {
        await onSubmit(message, attachments);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Homepage default behavior: simulate processing then optionally redirect
    setTimeout(() => {
      // Store the message for the dashboard form
      localStorage.setItem("hero-project-brief", message);
      // Store attachment count for dashboard notification
      if (attachments.length > 0) {
        localStorage.setItem(
          "hero-attachment-count",
          attachments.length.toString()
        );
      }
      if (redirectOnSubmit) {
        router.push("/dashboard");
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // Add files to processing state
      const newFiles = files.map((file) => ({ file, isLoading: true }));
      setProcessingFiles((prev) => [...prev, ...newFiles]);

      // Add immediately to UI, we'll optionally process in background
      setAttachments((prev) => [...prev, ...files]);
      setProcessingFiles((prev) =>
        prev.map((f) =>
          files.includes(f.file) ? { ...f, isLoading: false } : f
        )
      );

      // Only persist large file data when NOT on dashboard flow (onSubmit absent)
      if (!onSubmit) {
        try {
          const sessionKey = `hero-files-${Date.now()}`;
          const fileReferences = files.map((file, index) => ({
            sessionKey: `${sessionKey}-${index}`,
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
          }));

          localStorage.setItem(
            "hero-file-references",
            JSON.stringify(fileReferences)
          );

          files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                sessionStorage.setItem(
                  `${sessionKey}-${index}`,
                  reader.result as string
                );
              } catch (err) {
                console.warn(
                  "Session storage quota exceeded; skipping file cache",
                  file.name
                );
              }
            };
            reader.readAsDataURL(file);
          });
        } catch (err) {
          console.warn(
            "Local storage quota exceeded; storing attachment count only"
          );
          try {
            localStorage.setItem(
              "hero-attachment-count",
              files.length.toString()
            );
          } catch {}
        }
      }

      // Optionally process files to get summaries if a consumer asks for it
      if (onFilesProcessed) {
        try {
          const processed = await Promise.all(
            files.map(async (file) => {
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/process-document", {
                  method: "POST",
                  body: formData,
                });
                const data = await res.json();
                console.log("🧠 Document processed", {
                  file: file.name,
                  type: data.type,
                  summary: data.summary,
                });
                return { file, summary: data.summary, type: data.type };
              } catch (err: any) {
                console.warn(
                  "Document processing failed",
                  file.name,
                  err?.message
                );
                return { file };
              }
            })
          );
          console.log(
            "📚 File summaries added",
            processed.map((p) => ({ file: p.file.name, summary: p.summary }))
          );
          onFilesProcessed(processed);
        } catch (err) {
          console.warn("Batch processing failed", err);
        }
      }

      toast.success(`${files.length} file(s) attached successfully!`);

      e.target.value = "";
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setProcessingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChipClick = (text: string, chipId: string) => {
    setMessage(text);
    setSelectedChip(chipId);
    try {
      if (chipId === "invoice") {
        localStorage.setItem("hero-request-type", "invoice");
      } else {
        localStorage.setItem("hero-request-type", "contract");
      }
    } catch {}
    // Clear selection after a brief moment
    setTimeout(() => setSelectedChip(null), 200);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                className="w-full p-4 border-0 focus:outline-none focus:ring-0 resize-none min-h-[60px] text-gray-800 text-lg relative z-10 bg-transparent"
                disabled={isTyping}
                style={{ outline: "none", boxShadow: "none" }}
              />
              {!message && (
                <div className="absolute left-4 top-4 text-lg text-gray-400 pointer-events-none flex">
                  <span className="typewriter-text">{displayedText}</span>
                  <span
                    className={`ml-0.5 w-0.5 bg-gray-400 animate-pulse ${
                      isAnimating ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ height: "1.2em", animation: "blink 1s infinite" }}
                  />
                </div>
              )}
            </div>

            {/* Additional custom fields slot */}
            {additionalFields && <div className="mt-4">{additionalFields}</div>}

            {/* File attachments display */}
            {processingFiles.length > 0 && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Attachments:</div>
                <div className="flex flex-wrap gap-2">
                  {processingFiles.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white px-3 py-1 rounded-md text-sm border border-gray-200"
                    >
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <span className="text-gray-700">
                        {attachment.file.name.length > 20
                          ? `${attachment.file.name.substring(0, 20)}...`
                          : attachment.file.name}
                      </span>
                      {attachment.isLoading ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
                      ) : (
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAttachClick}
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                  disabled={isTyping}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  Add project files
                  <span className="text-gray-400 text-xs">(optional)</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || isTyping}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-orange-400 to-orange-500 text-white border-b-[1.5px] border-orange-700 shadow-[0_0_0_2px_rgba(0,0,0,0.04),0_0_14px_0_rgba(255,255,255,0.19)] transition-all duration-300 hover:shadow-orange-300 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm rounded-md"
                >
                  {isTyping ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Get Started
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {isTyping && (
          <div className="mt-4 text-center animate-pulse">
            <div className="text-sm text-gray-500 italic">
              Creating your contract with Talon...
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Pills */}
      <SuggestionPills
        onChipClick={handleChipClick}
        selectedChip={selectedChip}
        hideSuggestions={hideSuggestions}
      />

      <style jsx>{`
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
