const timetable = document.getElementById("timetable");

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const startHour = 8;
const endHour = 20;

//create top header row
timetable.innerHTML += `<div class="time-label"></div>`;
days.forEach(day => {
  timetable.innerHTML += `<div class="day-label">${day}</div>`;
});

//create each hour row
for (let hour = startHour; hour < endHour; hour++) {
  const hourLabel = hour < 12 ? `${hour} AM`
                  : hour === 12 ? `12 PM`
                  : `${hour - 12} PM`;

  timetable.innerHTML += `<div class="time-label">${hourLabel}</div>`;

  days.forEach(day => {
    timetable.innerHTML += `<div class="cell" data-day="${day}" data-time="${hour}"></div>`;
  });
}


//get the timetable info for logged in user
fetch("http://localhost:3000/api/timetable", {
  method: "GET",
  credentials: "include" 
})
  .then(res => res.json())
  .then(data => {
    //for each of the timetable entries, split the data into variables
    data.forEach(entry => {
      const start = parseInt(entry.start_time.split(":")[0]);
      const end = parseInt(entry.end_time.split(":")[0]);
      const day = entry.day;

      const classData = { name: entry.name, day, start, end };

      //if it is active, then add it to the timetable, if not, add it to the remvoed list
      if (!entry.is_active) {
        addToRemovedList(classData);
      } else {
        addClassToTimetable(classData);
      }
    });
  })
  .catch(err => {
    console.error('Failed to load timetable:', err);
  });

//function to add a class to the timetable
function addClassToTimetable({ name, day, start, end }) {
  //create a block, storing if it is the header block that will have the 'x' (for multi hour)
  const createBlock = (isMain = false) => {
    const block = document.createElement("div");
    block.classList.add("class-block");

    //add the name 
    const label = document.createElement("span");
    label.textContent = name;
    block.appendChild(label);

    //add the 'x' button if it is the main 
    if (isMain) {
      const close = document.createElement("div");
      close.classList.add("close-btn");
      close.textContent = "×";
      //save all the information and then add it to the removed list with that informatoin
      close.onclick = () => {
        for (let hour = start; hour < end; hour++) {
          const linkedCell = document.querySelector(`.cell[data-day="${day}"][data-time="${hour}"]`);
          const linkedBlock = linkedCell?.querySelector(".class-block");
          if (linkedBlock) linkedBlock.remove();
        }
        addToRemovedList({ name, day, start, end });

        //update the is_active variable in the database
        fetch("http://localhost:3000/api/timetable/update-active", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, day, start_time: start, end_time: end, is_active: 0 })
        }).catch(err => console.error("Failed to deactivate class", err));
      };
      block.appendChild(close);
    }

    return block;
  };

  //add a block for each hour the class lasts
  for (let hour = start; hour < end; hour++) {
    const cell = document.querySelector(`.cell[data-day="${day}"][data-time="${hour}"]`);
    if (!cell) continue;
    const block = createBlock(hour === start);
    cell.appendChild(block);
  }
}

//function for moving to the removed list 
function addToRemovedList(classData) {
  //storage container
  const container = document.getElementById("removed-classes");

  const block = document.createElement("div");
  block.classList.add("class-block", "removed-block");
  block.textContent = classData.name;

  //when it gets removed from the removed, then it needs to be added to the timetable
  block.onclick = () => {
    block.remove();
    addClassToTimetable(classData);



    //update the is_active thingy
    fetch("http://localhost:3000/api/timetable/update-active", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...classData, is_active: 1 })
  }).catch(err => console.error("Failed to reactivate class", err));
  };

  container.appendChild(block);
}



//function to add class from custom 
function handleAddCustomClass() {
  //get the values from the form
  const name = document.getElementById("custom-name").value.trim();
  const day = document.getElementById("custom-day").value;
  const start = parseInt(document.getElementById("custom-start-time").value);
  const end = parseInt(document.getElementById("custom-end-time").value);

  //check they all are valid
  if (!name || !day || isNaN(start) || isNaN(end) || end <= start) {
    alert("Please fill out all fields correctly. End time must be after start time.");
    return;
  }

  //debugging
  console.log(start);
  console.log(end);


  //add to timetbale
  addClassToTimetable({ name, day, start, end });

  //add class to database
  fetch("http://localhost:3000/api/timetable/add", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, day, start_time: start, end_time: end })
  }).catch(err => console.error("Add failed", err));

  //clear form
  document.getElementById("custom-name").value = "";
  document.getElementById("custom-day").value = "";
  document.getElementById("custom-start-time").value = "";
  document.getElementById("custom-end-time").value = "";
}