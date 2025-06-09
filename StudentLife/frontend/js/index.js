//=================================
//much of this is the exact same code as the degree planner
//the only reason i didnt put it as a function and call the function
//is because the degree planner is supposed to work differently
//but here we are, post crash, loving life
//=================================

//map the colors again
const typeClass = {
  COMPULSORY: "compulsory",
  STREAM: "stream",
  PLACEMENT: "placement",
  ELECTIVE_1: "elective",
  ELECTIVE_MATHS: "elective",
  ELECTIVE_COMPUTING: "elective",
  ELECTIVE_3: "elective",
  ELECTIVE_4: "elective",
  STREAM_ELECTIVE: "stream",
};

//track selected papers
const selectedPapers = new Set();  

//when the page loads add a button for user to open the select papers modal
document.addEventListener("DOMContentLoaded", () => {
  const loadingOverlay = document.getElementById("loading-overlay");
  const container = document.getElementById("select-widget-container");

  const widget = document.createElement("div");
  widget.className = "widget";
  widget.textContent = "Select Papers";

  //note that there is a link in there to go to the degree planner page
  //i want to murder that link
  //many time over
  //it was a pain to get right
  //im mad
  const modal = document.createElement("div");
  modal.className = "modal hidden";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn">&times;</span>
      <h2>Select your papers for this semester</h2>
      <p>Don't know what papers you are taking?</p>      
      <a href="degree-planner.html">Go to Degree Planner</a><br>
      <div id="paper-list"></div>
      <button id="submit-papers-btn">Confirm Selection</button> 
    </div>
  `;

  //this is the code for the select button
  //in the server.js file there is a route that was used to make this
  //again, this doesnt work, but we are keeping it for future reference

  // modal.querySelector("#submit-papers-btn").onclick = () => {
  //   loadingOverlay.classList.add("show");
  //   fetch("http://localhost:3000/api/papers/activate", {
  //     method: "POST",
  //     credentials: "include",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ selected: Array.from(selectedPapers) }),
  //   })
  //   .then(res => {
  //     if (!res.ok) throw new Error("Failed to activate papers");

  //     return fetch("http://localhost:3000/api/scrape/run", {
  //       method: "GET",
  //       credentials: "include"
  //     });
  //   })
  //   .then(res => {
  //     if (!res.ok) throw new Error("Scraping failed");
  //     return res.json();
  //   })
  //   .then(data => {
  //     console.log("Scrape response:", data);
  //     modal.classList.add("hidden");
  //     alert("Scraping complete. Timetable and grade info loaded!");
  //   })
  //   .catch(err => {
  //     console.error("Activation error:", err);
  //     alert("Failed to activate or scrape.");
  //   })
  //   .finally(() => {
  //     loadingOverlay.classList.remove("show");
  //   });
  // };

  container.appendChild(widget);
  document.body.appendChild(modal);

  widget.onclick = () => {
    modal.classList.remove("hidden");

    const paperList = document.getElementById("paper-list");
    paperList.innerHTML = "Loading...";

    //when the modal is opened, load the papers the same way it was done in the degree planner
    fetch("http://localhost:3000/api/papers", { credentials: "include" })
      .then(res => res.json())
      .then(papers => {
        paperList.innerHTML = "";

        //group the years
        const grouped = { 1: [], 2: [], 3: [], 4: [] };
        papers.forEach(p => {
          if (grouped[p.year]) grouped[p.year].push(p);
        });

        //loop through each year, creating a row for each year and then a paper for each paper and what not
        for (let year = 1; year <= 4; year++) {
          if (grouped[year].length === 0) continue;

          const row = document.createElement("div");
          row.className = "planner-row";

          const heading = document.createElement("h3");
          heading.textContent = `Year ${year}`;
          row.appendChild(heading);

          const paperRow = document.createElement("div");
          paperRow.className = "paper-row";

          grouped[year].forEach(paper => {
            const paperBox = document.createElement("div");
            paperBox.className = `paper-box ${typeClass[paper.paper_type] || "default"}`;
            paperBox.textContent = paper.paper_code;

            //modify paperBox.onclick so that it adds it to the list and adds to the selected thingy so that it goes a different colour
            //not good articulating but you get what i mean
            paperBox.onclick = () => {
              const code = paper.paper_code;
              console.log("Clicked", code);
              if (selectedPapers.has(code)) {
                selectedPapers.delete(code);
                paperBox.classList.remove("selected");
              } else {
                selectedPapers.add(code);
                paperBox.classList.add("selected");
              }
            };

            paperRow.appendChild(paperBox);
          });

          row.appendChild(paperRow);
          paperList.appendChild(row);
        }
      })
      //for the error, throw an error, but also display on the modal that there are no papers
      .catch(err => {
        console.error("Failed to fetch papers:", err);
        paperList.innerHTML = "<p style='color:red;'>Failed to load papers.</p>";
      });
  };

  //close the modal when click the close button and also when clicking off it
  modal.querySelector(".close-btn").onclick = () =>
    modal.classList.add("hidden");

  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };
});
