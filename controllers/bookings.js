const Booking = require("../models/Booking");
const Company = require("../models/Company");

// allowed date range
const START_DATE = new Date("2022-05-10");
const END_DATE = new Date("2022-05-13");

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Private
exports.getBookings = async (req, res, next) => {
	let query;

	if (req.user.role !== "admin") {
		query = Booking.find({ user: req.user.id }).populate({
			path: "company",
			select: "name address telephone",
		});
	} else {
		if (req.params.companyId) {
			query = Booking.find({ company: req.params.companyId }).populate({
				path: "company",
				select: "name address telephone",
			});
		} else {
			query = Booking.find().populate({
				path: "company",
				select: "name address telephone",
			});
		}
	}

	try {
		const bookings = await query;
		res.status(200).json({
			success: true,
			count: bookings.length,
			data: bookings,
		});
	} catch (err) {
		res.status(500).json({ success: false, msg: "Cannot find Booking" });
	}
};

//@desc     Get single booking
//@route    GET /api/v1/bookings/:id
//@access   Private
exports.getBooking = async (req, res, next) => {
	try {
		const booking = await Booking.findById(req.params.id).populate({
			path: "company",
			select: "name description telephone",
		});

		if (!booking) {
			return res.status(404).json({
				success: false,
				msg: `No booking with the id of ${req.params.id}`,
			});
		}

		// ownership check
		if (
			booking.user.toString() !== req.user.id &&
			req.user.role !== "admin"
		) {
			return res.status(401).json({
				success: false,
				msg: "Not authorized to access this booking",
			});
		}

		res.status(200).json({ success: true, data: booking });
	} catch (err) {
		res.status(500).json({ success: false, msg: "Cannot find Booking" });
	}
};

//@desc     Add booking
//@route    POST /api/v1/companies/:companyId/bookings
//@access   Private
exports.addBooking = async (req, res, next) => {
	try {
		req.body.company = req.params.companyId;

		const company = await Company.findById(req.params.companyId);

		if (!company) {
			return res.status(404).json({
				success: false,
				msg: `No company with the id of ${req.params.companyId}`,
			});
		}

		req.body.user = req.user.id;

		const bookingDate = new Date(req.body.date);

		// date constraint
		if (bookingDate < START_DATE || bookingDate > END_DATE) {
			return res.status(400).json({
				success: false,
				msg: "Booking date must be between May 10-13, 2022",
			});
		}

		// max 3 bookings (non-admin)
		if (req.user.role !== "admin") {
			const count = await Booking.countDocuments({
				user: req.user.id,
			});

			if (count >= 3) {
				return res.status(400).json({
					success: false,
					msg: "User has already made 3 bookings",
				});
			}
		}

		const booking = await Booking.create(req.body);

		res.status(200).json({
			success: true,
			data: booking,
		});
	} catch (err) {
		res.status(500).json({ success: false, msg: "Cannot create Booking" });
	}
};

//@desc     Update booking
//@route    PUT /api/v1/bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
	try {
		let booking = await Booking.findById(req.params.id);

		if (!booking) {
			return res.status(404).json({
				success: false,
				msg: `No booking with the id of ${req.params.id}`,
			});
		}

		if (
			booking.user.toString() !== req.user.id &&
			req.user.role !== "admin"
		) {
			return res.status(401).json({
				success: false,
				msg: "Not authorized to update this booking",
			});
		}

		// validate date if being updated
		if (req.body.date) {
			const newDate = new Date(req.body.date);
			if (newDate < START_DATE || newDate > END_DATE) {
				return res.status(400).json({
					success: false,
					msg: "Booking date must be between May 10-13, 2022",
				});
			}
		}

		booking = await Booking.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true, runValidators: true }
		);

		res.status(200).json({ success: true, data: booking });
	} catch (err) {
		res.status(500).json({ success: false, msg: "Cannot update Booking" });
	}
};

//@desc     Delete booking
//@route    DELETE /api/v1/bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
	try {
		let booking = await Booking.findById(req.params.id);

		if (!booking) {
			return res.status(404).json({
				success: false,
				msg: `No booking with the id of ${req.params.id}`,
			});
		}

		if (
			booking.user.toString() !== req.user.id &&
			req.user.role !== "admin"
		) {
			return res.status(401).json({
				success: false,
				msg: "Not authorized to delete this booking",
			});
		}

		await booking.deleteOne();

		res.status(200).json({ success: true, data: {} });
	} catch (err) {
		res.status(500).json({ success: false, msg: "Cannot delete Booking" });
	}
};