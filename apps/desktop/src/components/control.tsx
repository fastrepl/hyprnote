import {
  type ErrorRouteComponent,
  NotFoundRouteComponent,
  useNavigate,
} from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw, Search } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@hypr/ui/components/ui/button";

export const ErrorComponent: ErrorRouteComponent = ({ error, reset }) => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-[300px] items-center justify-center p-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </motion.div>

            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-neutral-900">
                Something went wrong
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-[260px]">
                {error.message || "An unexpected error occurred."}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => reset()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Try again
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/app/main" })}>
                <Home className="mr-1.5 h-3.5 w-3.5" />
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const NotFoundComponent: NotFoundRouteComponent = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-[300px] items-center justify-center p-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <Search className="h-6 w-6 text-neutral-400" />
            </motion.div>

            <div className="space-y-1.5">
              <motion.span
                className="block text-4xl font-bold text-neutral-300"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              >
                404
              </motion.span>
              <h2 className="text-base font-semibold text-neutral-900">
                Page not found
              </h2>
              <p className="text-sm text-neutral-500">
                The page you're looking for doesn't exist.
              </p>
            </div>

            <div className="pt-2">
              <Button size="sm" onClick={() => navigate({ to: "/app/main" })}>
                <Home className="mr-1.5 h-3.5 w-3.5" />
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
