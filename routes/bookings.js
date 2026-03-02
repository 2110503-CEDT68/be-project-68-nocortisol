const express = require("express");
const {
	getBookings,
	getBooking,
	addBooking,
	updateBooking,
	deleteBooking,
} = require("../controllers/bookings");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

router.route("/").get(protect, getBookings).post(protect, addBooking);

router
	.route("/:id")
	.get(protect, getBooking)
	.put(protect, updateBooking)
	.delete(protect, deleteBooking);

module.exports = router;
