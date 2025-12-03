import {
  type ErrorRouteComponent,
  NotFoundRouteComponent,
  useNavigate,
} from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw, Search } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@hypr/ui/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
    },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const ErrorComponent: ErrorRouteComponent = ({ error, reset }) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <motion.div
        className="relative max-w-md w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="absolute inset-0 bg-destructive/5 rounded-3xl blur-3xl"
          variants={pulseVariants}
          animate="animate"
        />

        <motion.div className="relative space-y-6 text-center p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <motion.div
            className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center"
            variants={iconVariants}
          >
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <h2 className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {error.message ||
                "An unexpected error occurred. Please try again."}
            </p>
          </motion.div>

          <motion.div
            className="flex justify-center gap-3 pt-2"
            variants={itemVariants}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => reset()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/app/main" })}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export const NotFoundComponent: NotFoundRouteComponent = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <motion.div
        className="relative max-w-md w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="absolute inset-0 bg-primary/5 rounded-3xl blur-3xl"
          variants={pulseVariants}
          animate="animate"
        />

        <motion.div className="relative space-y-6 text-center p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <motion.div
            className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center"
            variants={iconVariants}
          >
            <Search className="w-8 h-8 text-muted-foreground" />
          </motion.div>

          <motion.div className="space-y-3" variants={itemVariants}>
            <motion.h1
              className="text-7xl font-bold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.3,
              }}
            >
              404
            </motion.h1>
            <h2 className="text-xl font-medium">Page not found</h2>
            <p className="text-sm text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/app/main" })}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};
