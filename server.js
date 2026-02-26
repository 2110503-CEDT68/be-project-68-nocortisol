const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

// Load env vars
dotenv.config({ path: "./config/config.env" });

// Connect to database
connectDB();

// Route files
const companies = require("./routes/companies");
const auth = require("./routes/auth");
const bookings = require("./routes/bookings");

const app = express();

// Body parser
app.use(express.json());

// Query parser
app.set("query parser", "extended");

// Cookie parser
app.use(cookieParser());

// Mount rounters
app.use("/api/v1/companies", companies);
app.use("/api/v1/auth", auth);
app.use("/api/v1/bookings", bookings);

const PORT = process.env.PORT || 5000;

const server = app.listen(
	PORT,
	console.log("Server running in", process.env.NODE_ENV, "mode on port", PORT),
);

process.on("unhandledRejection", (err, promise) => {
	console.log(`Error: ${err.message}`);

	// Close server & exit process
	server.close(() => process.exit(1));
});
