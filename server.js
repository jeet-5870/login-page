import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// In-memory storage for PINs (Use a database in production)
const pinStore = new Map();
const pinExpiryTime = 5 * 60 * 1000; // PIN expires in 5 minutes

// Configure Nodemailer with Gmail SMTP & SSL
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // Use SSL
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// API route to send login PIN
app.post("/send-pin", async (req, res) => {
    const email = req.body.email;
    console.log("📩 Received request to send PIN to:", email);

    if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "❌ Valid email required!" });
    }

    // Generate and store PIN with expiry
    const pin = Math.floor(100000 + Math.random() * 900000);
    pinStore.set(email, { pin, expiry: Date.now() + pinExpiryTime });

    console.log("🔢 Generated PIN:", pin);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Login PIN",
        text: `Your login PIN is: ${pin}. It expires in 5 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully");
        res.json({ message: "PIN sent successfully!" });
    } catch (error) {
        console.error("❌ Error sending email:", error);
        res.status(500).json({ message: "Failed to send PIN. Try again later." });
    }
});

// API route to verify the PIN
app.post("/verify-pin", (req, res) => {
    const { email, enteredPin } = req.body;

    if (!email || !enteredPin || enteredPin.length !== 6) {
        return res.status(400).json({ message: "❌ Invalid email or PIN format!" });
    }

    const storedData = pinStore.get(email);

    if (!storedData) {
        return res.status(400).json({ message: "❌ No PIN found. Request a new one." });
    }

    if (Date.now() > storedData.expiry) {
        pinStore.delete(email);
        return res.status(400).json({ message: "❌ PIN expired. Request a new one." });
    }

    if (parseInt(enteredPin) === storedData.pin) {
        pinStore.delete(email); // Remove PIN after verification
        return res.json({ message: "✅ PIN verified! Login successful." });
    } else {
        return res.status(400).json({ message: "❌ Invalid PIN. Please try again." });
    }
});

// Start the server on the dynamic port
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});