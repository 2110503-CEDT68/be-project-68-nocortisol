const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
	apptDate: {
		type: Date,
		required: true,
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	hospital: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Company",
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Booking", BookingSchema);
