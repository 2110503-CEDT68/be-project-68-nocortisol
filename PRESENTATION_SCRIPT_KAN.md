# Presentation Script — Functional Part (kan;ts)

> Your role: อธิบาย **ว่าโค้ดแก้อะไรไปบ้าง** ตาม MVC และแต่ละ requirement มาจากโค้ดส่วนไหน ทำงานยังไง

---

## โครงสร้างโปรเจกต์ (MVC Overview)

```
models/      → กำหนดโครงสร้างข้อมูลใน MongoDB (M)
controllers/ → logic การทำงานของแต่ละ API (C)
routes/      → กำหนด URL path และ middleware (เชื่อม V-C)
middleware/  → auth guard ก่อนเข้าถึง route ที่ต้อง login
```

---

## 1. Models — สิ่งที่เพิ่ม / แก้ไข

### `models/User.js` — เพิ่ม field `tel`
**Requirement:** User ต้องมีเบอร์โทรศัพท์

```js
tel: {
    type: String,
    required: [true, "Please add a telephone number"],
    match: [/^0\d{8,9}$/, "Please add a valid telephone number"],
},
```
- เพิ่ม field `tel` พร้อม regex validation ว่าต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก

---

### `models/Company.js` — Model ใหม่
**Requirement:** ระบบต้องมีบริษัทที่ผู้ใช้จะ book เข้าไปสัมภาษณ์

- มี field ครบ: `name`, `address`, `district`, `province`, `postalcode`, `tel`, `website`, `description`
- `website` มี regex validation ให้รับได้ทั้ง http/https URL
- มี **Virtual field** `bookings` → ทำ reverse populate เพื่อ query bookings ที่เชื่อมกับ company นั้น

```js
CompanySchema.virtual("bookings", {
    ref: "Booking",
    localField: "_id",
    foreignField: "company",
    justOne: false,
});
```
> Virtual ไม่ได้เก็บใน DB แต่ใช้ตอน query populate เพื่อดึง bookings ที่เกี่ยวข้องมาพร้อมกัน

---

### `models/Booking.js` — Model ใหม่
**Requirement:** User จองคิวสัมภาษณ์กับบริษัท

```js
{
    bookingDate: Date,       // วันที่จอง
    user: ObjectId → User,   // ใครจอง
    company: ObjectId → Company, // จองกับบริษัทไหน
    createdAt: Date
}
```
- เชื่อม User และ Company ด้วย ObjectId reference

---

## 2. Controllers — Logic หลัก

### `controllers/auth.js`
| Function | Route | สิ่งที่ทำ |
|---|---|---|
| `register` | POST /auth/register | รับ name, email, password, **tel**, role → สร้าง User ใน DB → return JWT |
| `login` | POST /auth/login | ตรวจ email+password → return JWT |
| `getMe` | GET /auth/me | ดึงข้อมูล user จาก token |
| `logout` | GET /auth/logout | clear cookie token |

- **เพิ่ม `tel`** ใน destructure ของ `register` เพื่อรับและบันทึก field ใหม่

---

### `controllers/companies.js`
| Function | Route | สิ่งที่ทำ |
|---|---|---|
| `getCompanies` | GET /companies | ดึงทุกบริษัท + filter/sort/pagination |
| `getCompany` | GET /companies/:id | ดึงบริษัทเดียว |
| `createCompany` | POST /companies | สร้างบริษัท (admin) |
| `updateCompany` | PUT /companies/:id | แก้ไขบริษัท (admin) |
| `deleteCompany` | DELETE /companies/:id | ลบบริษัท + **cascade delete bookings** |

**ไฮไลต์ — Cascade Delete:**
```js
// ใน deleteCompany
await Booking.deleteMany({ company: company_id }); // ลบ booking ที่เกี่ยวข้องก่อน
await Company.deleteOne({ _id: company_id });       // แล้วค่อยลบบริษัท
```
> Requirement: ถ้าลบ company ต้องลบ bookings ของ company นั้นทั้งหมดด้วย

---

### `controllers/bookings.js` — หัวใจของ requirement
มี helper function 2 ตัวที่สร้างขึ้นเพื่อให้โค้ดสะอาดขึ้น:

```js
const START_DATE = new Date("2022-05-10");
const END_DATE   = new Date("2022-05-13");

const isValidBookingDate = (date) => date >= START_DATE && date <= END_DATE;

const isOwnerOrAdmin = (booking, user) =>
    booking.user.toString() === user.id || user.role === "admin";
```

#### `addBooking` — Requirement หลัก 3 ข้อ
```
POST /api/v1/companies/:companyId/bookings
```

1. **ต้องจองในช่วงวันที่กำหนด (May 10–13, 2022)**
```js
if (!isValidBookingDate(new Date(req.body.bookingDate))) {
    return res.status(400).json({ msg: "Booking date must be between May 10-13, 2022" });
}
```

2. **User ทำ booking ได้ไม่เกิน 3 ครั้ง (admin ไม่จำกัด)**
```js
if (req.user.role !== "admin") {
    const count = await Booking.countDocuments({ user: req.user.id });
    if (count >= 3) {
        return res.status(400).json({ msg: "User has already made 3 bookings" });
    }
}
```

3. **Booking ผูกกับ company ที่มีอยู่จริง**
```js
const company = await Company.findById(req.params.companyId);
if (!company) return res.status(404).json({ msg: "No company..." });
```

#### `getBookings` — Role-based access
```
GET /api/v1/bookings
```
```js
if (req.user.role !== "admin") {
    query = Booking.find({ user: req.user.id }); // user เห็นแค่ของตัวเอง
} else {
    query = Booking.find(); // admin เห็นทั้งหมด
}
```

#### `getBooking / updateBooking / deleteBooking` — Ownership check
```js
if (!isOwnerOrAdmin(booking, req.user)) {
    return res.status(403).json({ msg: "Not authorized..." });
}
```
> User อื่นแก้/ลบ booking ของคนอื่นไม่ได้ เว้นแต่ admin

#### `updateBooking` — Validate date ด้วยเมื่อมีการแก้
```js
if (req.body.bookingDate) {
    if (!isValidBookingDate(new Date(req.body.bookingDate))) {
        return res.status(400).json({ msg: "Booking date must be between May 10-13, 2022" });
    }
}
```

---

## 3. Middleware — `middleware/auth.js`

### `protect` — ตรวจ JWT ก่อนเข้า route
```js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await User.findById(decoded.id); // แปะ user object ไว้ใน req
next();
```
> ทุก route ที่ต้อง login จะผ่าน middleware นี้ก่อน

### `authorize(...roles)` — ตรวจ role
```js
exports.authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403)...
    next();
};
```
> ใช้ใน route ที่จำกัดเฉพาะ admin เช่น create/update/delete company

---

## 4. Routes — การเชื่อม URL กับ Controller

### Nested Route (สำคัญ)
```
POST /api/v1/companies/:companyId/bookings
```
- `routes/companies.js` → forward `/companies/:companyId/bookings` ไปที่ booking router
- `routes/bookings.js` ใช้ `express.Router({ mergeParams: true })` เพื่อรับ `companyId` จาก parent route

### ตัวอย่าง route guard
```js
// bookings route — ทุก endpoint ต้อง login ก่อน
router.route("/").get(protect, getBookings).post(protect, addBooking);
```

---

## สรุป Requirements → โค้ด

| Requirement | ไฟล์ | สิ่งที่ทำ |
|---|---|---|
| User มี tel | `models/User.js` | เพิ่ม field tel + regex validation |
| มีระบบบริษัท | `models/Company.js`, `controllers/companies.js` | Model + Full CRUD |
| จองคิวสัมภาษณ์ | `models/Booking.js`, `controllers/bookings.js` | Model + CRUD |
| จองได้แค่ May 10–13 | `controllers/bookings.js` → `addBooking`, `updateBooking` | date range check |
| จองได้ max 3 ครั้ง/user | `controllers/bookings.js` → `addBooking` | `countDocuments >= 3` |
| User เห็นแค่ booking ตัวเอง | `controllers/bookings.js` → `getBookings` | role check + filter by user |
| Admin เห็นทุก booking | `controllers/bookings.js` → `getBookings` | role === "admin" → no filter |
| ลบแค่ booking ของตัวเอง | `controllers/bookings.js` → `deleteBooking` | `isOwnerOrAdmin` check |
| ลบ company → ลบ booking ด้วย | `controllers/companies.js` → `deleteCompany` | cascade `deleteMany` |
| ต้อง login ก่อนจอง | `middleware/auth.js` → `protect` | JWT verify |
| เฉพาะ admin สร้าง/แก้/ลบ company | `middleware/auth.js` → `authorize` + routes | role guard |
