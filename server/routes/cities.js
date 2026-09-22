const express = require("express");
const cities = require("../data/cities");

const router = express.Router();
router.get("/", (_req, res) => res.json(cities));

module.exports = router;
