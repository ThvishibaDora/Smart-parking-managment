
const parkingGrid = document.getElementById("parking-grid");
const slotSelect = document.getElementById("slot-select");
const parkingForm = document.getElementById("parking-form");
const vehicleInput = document.getElementById("vehicle-number");
const recordsBody = document.getElementById("records-body");
const message = document.getElementById("message");

let parkingSlots = [];

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#d94848" : "#16865c";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function renderDashboard() {
  const occupied = parkingSlots.filter(slot => slot.is_occupied).length;
  const available = parkingSlots.length - occupied;
  const percentage = parkingSlots.length
    ? Math.round((occupied / parkingSlots.length) * 100)
    : 0;

  document.getElementById("total-slots").textContent =
    parkingSlots.length;
  document.getElementById("available-slots").textContent = available;
  document.getElementById("occupied-slots").textContent = occupied;
  document.getElementById("occupancy").textContent = `${percentage}%`;

  parkingGrid.innerHTML = parkingSlots.map(slot => `
    <div class="slot ${slot.is_occupied ? "occupied" : ""}">
      <strong>Slot ${slot.slot_number}</strong>
      <span class="car-icon">${slot.is_occupied ? "🚗" : "🅿️"}</span>
      <span>${slot.is_occupied ? "Occupied" : "Available"}</span>
      ${slot.is_occupied
        ? `<small>${escapeHTML(slot.vehicle_number || "")}</small>`
        : ""}
    </div>
  `).join("");

  const availableSlots = parkingSlots.filter(slot => !slot.is_occupied);

  slotSelect.innerHTML =
    '<option value="">Choose an available slot</option>' +
    availableSlots.map(slot =>
      `<option value="${slot.slot_number}">Slot ${slot.slot_number}</option>`
    ).join("");

  const occupiedSlots = parkingSlots.filter(slot => slot.is_occupied);

  recordsBody.innerHTML = occupiedSlots.length
    ? occupiedSlots.map(slot => `
        <tr>
          <td>${escapeHTML(slot.vehicle_number || "Unknown")}</td>
          <td>Slot ${slot.slot_number}</td>
          <td>${formatTime(slot.updated_at)}</td>
          <td>
            <button class="exit-button" data-exit="${slot.slot_number}">
              Vehicle Exit
            </button>
          </td>
        </tr>
      `).join("")
    : '<tr><td colspan="4">No vehicles parked yet.</td></tr>';
}

async function loadParkingSlots() {
  try {
    const response = await fetch("/api/parking-slots");

    if (!response.ok) {
      throw new Error("Could not load parking slots.");
    }

    parkingSlots = await response.json();
    renderDashboard();
  } catch (error) {
    showMessage(error.message, true);
  }
}

parkingForm.addEventListener("submit", async event => {
  event.preventDefault();

  const vehicleNumber = vehicleInput.value.trim().toUpperCase();
  const slotNumber = Number(slotSelect.value);

  if (!vehicleNumber || !slotNumber) {
    showMessage("Enter a vehicle number and select a slot.", true);
    return;
  }

  const slot = parkingSlots.find(item => item.slot_number === slotNumber);

  if (!slot || slot.is_occupied) {
    showMessage("This slot is no longer available. Refresh and try again.", true);
    await loadParkingSlots();
    return;
  }

  try {
    const response = await fetch(`/api/parking-slots/${slotNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_occupied: true,
        vehicle_number: vehicleNumber
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not park vehicle.");
    }

    vehicleInput.value = "";
    parkingForm.reset();

    await loadParkingSlots();
    showMessage(`Vehicle ${vehicleNumber} parked in Slot ${slotNumber}.`);
  } catch (error) {
    showMessage(error.message, true);
  }
});

recordsBody.addEventListener("click", async event => {
  const button = event.target.closest("[data-exit]");

  if (!button) return;

  const slotNumber = Number(button.dataset.exit);

  try {
    const response = await fetch(`/api/parking-slots/${slotNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_occupied: false })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not release parking slot.");
    }

    await loadParkingSlots();
    showMessage(`Slot ${slotNumber} is now available.`);
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById("current-date").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

loadParkingSlots();
