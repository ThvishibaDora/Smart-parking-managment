
require("dotenv").config();

const express = require("express");
const path = require("path");
const supabase = require("./supabase");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Get all parking slots
app.get("/api/parking-slots", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("parking_slots")
      .select("*")
      .order("slot_number", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching parking slots:", error.message);
    res.status(500).json({ error: "Could not fetch parking slots." });
  }
});

// Update a parking slot's status
app.patch("/api/parking-slots/:slotNumber", async (req, res) => {
  try {
    const slotNumber = Number(req.params.slotNumber);
    const { is_occupied, vehicle_number } = req.body;

    if (
      !Number.isInteger(slotNumber) ||
      slotNumber < 1 ||
      slotNumber > 9 ||
      typeof is_occupied !== "boolean"
    ) {
      return res.status(400).json({ error: "Invalid slot details." });
    }

    const { data, error } = await supabase
      .from("parking_slots")
      .update({
        is_occupied,
        vehicle_number: is_occupied
          ? (vehicle_number || null)
          : null,
        updated_at: new Date().toISOString()
      })
      .eq("slot_number", slotNumber)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error updating parking slot:", error.message);
    res.status(500).json({ error: "Could not update parking slot." });
  }
});

app.listen(PORT, () => {
  console.log(`Smart Parking server running at http://localhost:${PORT}`);
});
