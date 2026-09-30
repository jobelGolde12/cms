"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log server-side for diagnostics; do not expose details to users.
    console.error("[production error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-lg w-full"
      >
        {/* Main Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
          {/* Decorative gradient blob */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full blur-3xl opacity-60" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-action-100 to-action-200 rounded-full blur-3xl opacity-60" />
          
          <div className="relative p-10 sm:p-12 text-center">
            {/* Illustration Container */}
            <div className="mb-8 relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mx-auto w-32 h-32 sm:w-40 sm:h-40 relative"
              >
                {/* Parachute Illustration */}
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full drop-shadow-lg"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Parachute canopy */}
                  <path
                    d="M40 80 Q100 20 160 80 L160 90 Q100 30 40 90 Z"
                    className="fill-brand-400"
                    opacity="0.9"
                  />
                  <path
                    d="M50 85 Q100 35 150 85"
                    className="stroke-brand-500"
                    strokeWidth="3"
                    fill="none"
                    opacity="0.6"
                  />
                  {/* Parachute lines */}
                  <line x1="60" y1="90" x2="85" y2="140" className="stroke-slate-400" strokeWidth="2" />
                  <line x1="100" y1="85" x2="100" y2="140" className="stroke-slate-400" strokeWidth="2" />
                  <line x1="140" y1="90" x2="115" y2="140" className="stroke-slate-400" strokeWidth="2" />
                  {/* Person */}
                  <circle cx="100" cy="150" r="12" className="fill-slate-700" />
                  <path
                    d="M85 165 Q100 180 115 165 L115 175 Q100 185 85 175 Z"
                    className="fill-action-500"
                  />
                  {/* Motion lines */}
                  <line x1="70" y1="40" x2="70" y2="55" className="stroke-slate-300" strokeWidth="2" strokeLinecap="round" />
                  <line x1="100" y1="30" x2="100" y2="50" className="stroke-slate-300" strokeWidth="2" strokeLinecap="round" />
                  <line x1="130" y1="40" x2="130" y2="55" className="stroke-slate-300" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.div>
            </div>

            {/* Logo - Optional, comment out if not needed */}
            <div className="mb-6 flex justify-center">
              <Logo size="lg" />
            </div>

            {/* Error Icon */}
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>

            {/* Heading */}
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight"
            >
              Aaaah! Something went wrong
            </motion.h1>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 text-base sm:text-lg mb-8 leading-relaxed max-w-sm mx-auto"
            >
              Brace yourself! We're working to get things back to normal. 
              You can try refreshing the page or come back later.
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:bg-brand-800 transition-all duration-200 shadow-lg shadow-brand-600/20 hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 active:bg-slate-300 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </motion.div>

            {/* Home Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6"
            >
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 transition-colors duration-200 font-medium"
              >
                <Home className="w-4 h-4" />
                Return to homepage
              </a>
            </motion.div>

            {/* Error Code (Optional - for dev mode) */}
            {process.env.NODE_ENV === "development" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 pt-6 border-t border-slate-100"
              >
                <p className="text-xs text-slate-400 font-mono">
                  Error: {error.message || "Unknown error"}
                  {error.digest && <span className="block mt-1">Digest: {error.digest}</span>}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Text */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-slate-400 text-sm mt-6"
        >
          If the problem persists, please{" "}
          <a href="/contact" className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2">
            contact support
          </a>
        </motion.p>
      </motion.div>
    </main>
  );
}