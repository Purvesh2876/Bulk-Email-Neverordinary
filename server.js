// Local dev server only. On Vercel, /api/send.js and /public are used directly.
require("dotenv").config();
const express = require("express");
const send = require("./api/send");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));
app.post("/api/send", send);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on http://localhost:${port}`));
