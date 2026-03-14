# Backend Changes Documentation

## Date: February 4, 2026

This document outlines all backend changes made during the frontend-backend integration.

---

## 1. User Model (`models/user.js`)

**Change:** Expanded schema to include all patient profile fields.

**Before:**
- Only had: `phoneNumber`, `role`, `name`, `email`, `isProfileCompleted`, `favorites`

**After - Added Fields:**
```javascript
// Basic Info
name: String,
fullName: String,
firstName: String,
lastName: String,
email: String,
phone: String,
avatar: String,

// Patient Profile
dateOfBirth: String,
gender: { type: String, enum: ["male", "female", "other", ""] },
bloodGroup: String,
height: Number,
weight: Number,

// Address (nested object)
address: {
  street: String,
  city: String,
  state: String,
  pincode: String,
  country: String,
}

// Location for nearby features
location: {
  latitude: Number,
  longitude: Number,
}

// Emergency Contact (nested object)
emergencyContact: {
  name: String,
  phone: String,
  relationship: String,
}

// Medical History (nested object)
medicalHistory: {
  conditions: [String],
  allergies: [String],
  previousSurgeries: [String],
  familyHistory: String,
}

phoneVerified: Boolean (default: false)
```

---

## 2. Notification Model (`models/notification.js`)

**Change:** Created the model (file was empty/missing).

**Schema:**
```javascript
{
  userId: ObjectId (ref: User),
  title: String (required),
  message: String (required),
  type: String (enum: ["appointment", "medication", "emergency", "system", "reminder"]),
  read: Boolean (default: false),
  data: Mixed (for additional context like appointmentId)
}
```

---

## 3. Appointment Controller (`controllers/appointmentcontroller.js`)

**Change:** Fixed `getAppointments` to allow both patients AND doctors.

**Before:**
- Only doctors could access (patients got 403 Forbidden)

**After:**
- Patients see their own appointments (`patientId: req.user.id`)
- Doctors see appointments for them (`doctorId: req.user.id`)
- Added `.populate('doctorId')` and `.populate('patientId')` for full data
- Added `.sort({ date: -1 })` for newest first

---

## 4. Frontend API Service (`src/services/api.js`)

**Change:** Added missing method aliases for backward compatibility.

**Added:**
- `medicalRecordAPI` (alias for `medicalRecordsAPI`)
- `getMedicalRecords(patientId)` method
- `getActiveMedications(patientId)` method

---

## 5. Frontend Auth Flow (`src/services/api.js`)

**Change:** Fixed token storage for new user registration.

**Issue:** `tempToken` from OTP verification was not being stored, causing "Unauthorized" errors during profile completion.

**Fix:** Added `tempToken` storage in `verifyOTP` function:
```javascript
// Store tempToken for new users (needed for select-role and complete-profile)
if (response.success && response.tempToken) {
  await setToken(response.tempToken);
}
```

---

## Summary of Files Modified

| File | Type | Change |
|------|------|--------|
| `models/user.js` | Backend | Expanded user schema |
| `models/notification.js` | Backend | Created notification model |
| `controllers/appointmentcontroller.js` | Backend | Fixed getAppointments for patients |
| `src/services/api.js` | Frontend | Added method aliases, fixed tempToken |
| `src/services/httpClient.js` | Frontend | New - centralized HTTP client |
| `.env` | Frontend | Added API configuration |

---

## 6. Frontend ID Field Fixes

**Change:** Updated all doctor-related screens to use MongoDB `_id` instead of `id`.

**Files Modified:**
- `src/screens/patient/DoctorSearchScreen.js`
- `src/screens/patient/FavoriteDoctorsScreen.js`

**Changes:**
- `doctor.id` → `doctor._id`
- `doctor.fullName` → `doctor.userId?.name || doctor.fullName`
- `doctor.specialization` → `doctor.speciality || doctor.specialization`
- `doctor.avatar` → `doctor.userId?.profilePicture || doctor.avatar`
- Removed non-existent `DoctorMap` and `DoctorList` navigation

---

## Notes for Testing

1. **Existing users** created before schema update may have missing fields
2. **Re-register** a new user to test full profile flow
3. **Backend restart** required after schema changes

---

## Known Remaining Issues

- Doctor search shows doctors with incomplete profiles (0 experience, 0 rating)
- Consider adding validation to hide incomplete doctor profiles
