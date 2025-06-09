import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Correct CORS setup
const corsOptions = {
    origin: "https://jeet-5870.github.io", // ✅ Fixed trailing slash
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    optionsSuccessStatus: 200 // Let cors handle preflight
};
app.use(cors(corsOptions));

const PORT = process.env.PORT || 3000;

const pinStore = new Map();
const pinExpiryTime = 5 * 60 * 1000;
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ✅ Route to send a PIN via email
app.post("/send-pin", async (req, res) => {
    res.setHeader("Content-Type", "application/json"); 
    const email = req.body.email;
    console.log("📩 Received request to send PIN to:", email);

    if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "❌ Valid email required!" });
    }

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

// ✅ Route to verify a PIN
app.post("/verify-pin", (req, res) => {
    res.setHeader("Content-Type", "application/json"); 
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
        pinStore.delete(email);
        return res.json({ message: "✅ PIN verified! Login successful." });
    } else {
        return res.status(400).json({ message: "❌ Invalid PIN. Please try again." });
    }
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
