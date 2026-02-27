// Helper utilities for bookings controller
module.exports = {
  COMPANY_POPULATE: { path: "company", select: "name address telephone" },

  isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
  },

  isDateInRange(date, start, end) {
    return date >= start && date <= end;
  },

  isBookingOwner(user, booking) {
    if (!booking || !booking.user) return false;
    return booking.user.toString() === user.id || user.role === "admin";
  },
};
