export const PLAN_LIMITS = {
  free: { mediaFiles: 0, aiAnswers: 1 },
  pro: { mediaFiles: 1, aiAnswers: 3 },
  max: { mediaFiles: 3, aiAnswers: 5 },
};

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export const PLAN_ORDER = ["free", "pro", "max"];

export const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  max: "Max",
};
