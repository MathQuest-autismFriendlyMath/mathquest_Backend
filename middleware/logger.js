import morgan from "morgan";

// Custom morgan format for better logging
const morganFormat =
  process.env.NODE_ENV === "development"
    ? "dev"
    : ":method :url :status :response-time ms - :res[content-length]";

export const logger = morgan(morganFormat);

export const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};
