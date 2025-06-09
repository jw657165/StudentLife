//wait for the page to load
document.addEventListener("DOMContentLoaded", () => {
  //get the papers of the user logged in
  fetch("http://localhost:3000/api/grades/papers", {
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("widget-container");

      //create a widget for each of the papers
      data.forEach(paper => {
        const widget = document.createElement("div");
        widget.className = "widget";
        widget.onclick = () => openExpandedView(paper.paper_code, paper.pid);

        //this needs to display the summary grades, but i havent got around to that
        widget.innerHTML = `
          <h3>${paper.paper_code}</h3><br>
          <p>  Click for details</p>
        `;

        //add the widget
        container.appendChild(widget);
      });
    })
    .catch(err => {
      console.error("Failed to load papers:", err);
    });
});

//function to open the pop up
function openExpandedView(code, pid) {
  //show modal
  document.getElementById("overlay").style.display = "flex";
  document.getElementById("expanded-title").textContent = code;

  //clear previous assignment table if any
  const view = document.getElementById("expanded-view");
  const existingTable = view.querySelector(".calculator-table");
  if (existingTable) existingTable.remove();

  //fetch assignment data
  fetch(`http://localhost:3000/api/grades/assignments/${pid}`, {
    credentials: "include"
  })
    .then(res => res.json())
    .then(assignments => {
      const table = document.createElement("div");
      table.className = "calculator-table";

      //check that there are assignments for that user
      if (assignments.length === 0) {
        table.innerHTML = `<div class="calc-row"><div>No assignments available.</div></div>`;
      } else {
        //header
        const header = document.createElement("div");
        header.className = "calc-row calc-header";
        header.innerHTML = `<div>Assessment</div><div>Weight (%)</div><div>Mark (%)</div><div>Letter Grade</div>`;
        table.appendChild(header);

        //assignment rows
        assignments.forEach(a => {
          const row = document.createElement("div");
          row.className = "calc-row";

          //create input for grade
          const input = document.createElement("input");
          input.type = "number";
          input.value = a.grade;
          input.min = 0;
          input.max = 100;
          input.style.width = "60px";

          const letterGrade = document.createElement("div");
          letterGrade.textContent = getLetterGrade(a.grade);


          //undateing the grade every change
          input.addEventListener("input", () => {
            const newVal = parseFloat(input.value);

            //update the assignment new grade for the recalculation of letter
            a.grade = isNaN(newVal) ? 0 : newVal;

            //update the letter grade
            letterGrade.textContent = getLetterGrade(newVal);

            // Recalculate the total summary based on all current grades
            const summary = calculateSummary(assignments);

            //update the summary row with new info
            currentRow.innerHTML = `
              <div><strong>Current Grade</strong></div>
              <div>${summary.currentWeight}%</div>
              <div>${summary.currentAvg}%</div>
              <div>${summary.currentLetter}</div>
            `;

            projectedRow.innerHTML = `
              <div><strong>Projected Grade</strong></div>
              <div>100%</div>
              <div>${summary.projectedAvg}%</div>
              <div>${summary.projectedLetter}</div>
            `;
          });

          //save grade on blur or enter
          input.addEventListener("blur", () => saveGrade(a.id, input.value));
          input.addEventListener("keydown", e => {
            if (e.key === "Enter") {
               //triggers save
              input.blur();
            }
          });

        
          //add cells to row
          row.innerHTML = `<div>${a.name}</div><div>${a.weight}</div>`;
          const gradeCell = document.createElement("div");
          gradeCell.appendChild(input);
          row.appendChild(gradeCell);
          row.appendChild(letterGrade);

          table.appendChild(row);

        });

      }
      //calculate summaries
      const summary = calculateSummary(assignments);

      //current grade
      const currentRow = document.createElement("div");
      currentRow.className = "calc-row calc-total";
      currentRow.innerHTML = `
        <div><strong>Current Grade</strong></div>
        <div>${summary.currentWeight}%</div>
        <div>${summary.currentAvg}%</div>
        <div>${summary.currentLetter}</div>
      `;
       

      //projected grade 
      const projectedRow = document.createElement("div");
      projectedRow.className = "calc-row calc-total";
      projectedRow.innerHTML = `
        <div><strong>Projected Grade</strong></div>
        <div>100%</div>
        <div>${summary.projectedAvg}%</div>
        <div>${summary.projectedLetter}</div>
      `;
          
      table.appendChild(currentRow);
      table.appendChild(projectedRow);


      view.appendChild(table);
    })
    .catch(err => {
      console.error("Failed to load assignments:", err);
    });
}


//close the modal
function closeExpandedView() {
  document.getElementById("overlay").style.display = "none";
}

//call the close when clicking off the modal
function handleOverlayClick(event) {
  if (event.target.id === "overlay") {
    closeExpandedView();
  }
}

//function to save grades to the dtabase
//just send them through the route and if there is an error, cry
function saveGrade(assignmentId, newGrade) {
  fetch(`http://localhost:3000/api/grades/assignments/${assignmentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ grade: parseFloat(newGrade) })
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to update grade");
      console.log(`Grade updated for assignment ${assignmentId}`);
    })
    .catch(err => {
      console.error("Error updating grade:", err);
      alert("Failed to save grade.");
    });
}


//get letter grade based on waikato scale
function getLetterGrade(grade) {
  if (grade >= 90) return "A+";
  if (grade >= 85) return "A";
  if (grade >= 80) return "A-";
  if (grade >= 75) return "B+";
  if (grade >= 70) return "B";
  if (grade >= 65) return "B-";
  if (grade >= 60) return "C+";
  if (grade >= 55) return "C";
  if (grade >= 50) return "C-";
  if (grade >= 40) return "D";
  return "E";
}

//calculate the summary weights
function calculateSummary(assignments) {
  let totalWeight = 0;
  let weightedSum = 0;
  let fullWeight = 0;

  //go through the assignments and save what grades are there and what havent been done yet
  assignments.forEach(a => {
    const grade = parseFloat(a.grade);
    const weight = parseFloat(a.weight);

    if (!isNaN(weight)) {
      fullWeight += weight;

      if (!isNaN(grade) && grade > 0) {
        totalWeight += weight;
        weightedSum += (grade * weight);
      }
    }
  });

  //calculate the overall grades
  const currentAvg = totalWeight > 0 ? (weightedSum / fullWeight) : 0;
  const projectedAvg = fullWeight > 0 ? (weightedSum / totalWeight) : 0;

  //return the grades and letter grades
  return {
    currentWeight: totalWeight,
    currentAvg: currentAvg.toFixed(2),
    currentLetter: getLetterGrade(currentAvg),
    projectedAvg: projectedAvg.toFixed(2),
    projectedLetter: getLetterGrade(projectedAvg)
  };
}

