const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config();

// Models
const Appointment = require('./models/appointment');
const User = require('./models/user');
const Doctor = require('./models/doctor');

async function diagnose() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB\n');

        const appointments = await Appointment.find()
            .populate('patientId')
            .populate('doctorId');

        console.log(`Total appointments in DB: ${appointments.length}\n`);

        appointments.forEach((apt, i) => {
            console.log(`[${i + 1}] Appointment ID: ${apt._id}`);
            console.log(`    Status: ${apt.status}`);
            console.log(`    Date: ${apt.date} Time: ${apt.time}`);
            console.log(`    Symptom: ${apt.symptoms || 'None'}`);

            if (apt.patientId) {
                if (apt.patientId._id) {
                    console.log(`    Patient: POPULATED`);
                    console.log(`        ID: ${apt.patientId._id}`);
                    console.log(`        fullName: "${apt.patientId.fullName}"`);
                    console.log(`        name: "${apt.patientId.name}"`);
                    console.log(`        firstName: "${apt.patientId.firstName}"`);
                    console.log(`        lastName: "${apt.patientId.lastName}"`);
                } else {
                    console.log(`    Patient: NOT POPULATED (ID only: ${apt.patientId})`);
                }
            } else {
                console.log(`    Patient: NULL`);
            }

            if (apt.doctorId) {
                if (apt.doctorId._id) {
                    console.log(`    Doctor: POPULATED (${apt.doctorId.fullName || apt.doctorId.name})`);
                } else {
                    console.log(`    Doctor: NOT POPULATED (ID only: ${apt.doctorId})`);
                }
            } else {
                console.log(`    Doctor: NULL`);
            }
            console.log('-------------------------------------------\n');
        });

        // Also check for users with no names
        const usersCount = await User.countDocuments();
        const mysteryUsers = await User.find({
            $and: [
                { fullName: { $exists: false } },
                { name: { $exists: false } }
            ]
        });
        console.log(`Total Users: ${usersCount}`);
        console.log(`Users with no name/fullName: ${mysteryUsers.length}`);

    } catch (err) {
        console.error('Diagnosis failed:', err);
    } finally {
        process.exit();
    }
}

diagnose();
