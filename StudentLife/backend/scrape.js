//lets try again (3rd file/try to make the scraping work)

//this is what is used to read and load up the prowser
//make sure puppeteer is installed in the directory when running this code
const puppeteer = require('puppeteer');

//this was used to write a json file, not used anymore but might me useful some other time
//const fs = require('fs');

//get the user id of the current account using the frontend/logged in
//i wonder what will happen if multiple tabs are logged in, oh well, future though
async function scrape(uid) {
	const browser = await puppeteer.launch({ headless: true}); //turn to false if you wanna see the pages popping up
	const pages = new Map();

	const mysql = require('mysql2/promise');

	//Connect to the db
	const db = mysql.createPool({host: 'localhost',user: 'root',password: '',database: 'student_tools'});

	//Get pids for the user
	const [pids] = await db.query('SELECT pid FROM user_papers WHERE uid = ?', [uid]);
	const pidList = pids.map(row => row.pid);

	if (pidList.length === 0) {
		console.error('No papers found for this user.');
		process.exit(1);
	}

	//Get paper codes
	const placeholders = pidList.map(() => '?').join(',');
	const [codePairs] = await db.query(`SELECT pid, paper_code FROM papers WHERE pid IN (${placeholders})`, pidList);

	if (codePairs.length === 0) {
		console.error('No course codes to scrape.');
		process.exit(1);
	}

	//remember to format the code so its not 'COMPX241-25A (HAM)', is 'COMPX241-25A%20(HAM)' 

	//load the pages
	for (const { pid, paper_code } of codePairs) {
  		const currCode = encodeURIComponent(paper_code);
		//change this if posible to grab the year (last 2 digits) and than based off the current month, generate A or B (as papers are only avalible once the sem has already started)
		const tempHardCodeYear = '-25A%20(HAM)'
		
		const page = await browser.newPage();
		const url = `https://paperoutlines.waikato.ac.nz/outline/${currCode}${tempHardCodeYear}`;
		try{
			await page.goto(url, {waitUntil: 'domcontentloaded'});
			console.log(`Opened ${currCode}`);
			pages.set(currCode, { page, pid });
			await new Promise(r => setTimeout(r, 100));
		}
		catch (err){
			console.warn(`Failed to open ${currCode}`, err.message);
		}	
	}

	for (const [currCode, { page, pid }] of pages.entries()) {
		try {
			//check page is loaded
			await page.bringToFront();
			await page.waitForFunction(() =>
				document.body.innerText.includes('Timetable'), { timeout: 60000 }
			);
			console.log(`Page ${currCode} loaded successfully.`);
			
			// scrape the actual timetable table data
			const timetableData = await page.evaluate(() => {
				const allLabels = document.querySelectorAll('label.col-md-2');
				let table = null;
				for (let label of allLabels) {
					if (label.innerText.trim() === 'Timetable') {
						const rowDiv = label.closest('.row');
						if (!rowDiv) break;
						const span = rowDiv.querySelector('span.col-md-10');
						if (!span) break;
						table = span.querySelector('table');
						break;
					}
				}
				if (!table) return [];
				const rows = Array.from(table.querySelectorAll('tr'));
				const data = [];
				for (let i = 1; i < rows.length; i++) { // skip header row
					const cells = rows[i].querySelectorAll('td');
					data.push({
						event: cells[0]?.innerText.trim(),
						day: cells[1]?.innerText.trim(),
						startTime: cells[2]?.innerText.trim(),
						endTime: cells[3]?.innerText.trim(),
						location: cells[4]?.innerText.trim()
					});
				}
				return data;
			});
			console.log(`Timetable of ${currCode} extracted`);
			
			// scrape the actual grade table data
			const assessmentData = await page.evaluate(() => {
				const allLabels = document.querySelectorAll('label.col-md-2');
				let table = null;
				for (let label of allLabels) {
					if (label.innerText.trim() === 'Assessment') {
						const rowDiv = label.closest('.row');
						if (!rowDiv) break;
						const span = rowDiv.querySelector('span.col-md-10');
						if (!span) break;
						table = span.querySelector('table');
						break;
					}
				}
				if (!table) return [];
				const rows = Array.from(table.querySelectorAll('tbody tr'));
				const data = [];
				for (let row of rows) {
					const classList = row.classList;
					//skip any headings (may need to be added onto if there are additioal/different formating)
					if (classList.contains('assessmentCategory') || classList.contains('assessmentBestOf') || classList.contains('assessmentTotal')) continue;
					const cells = row.querySelectorAll('td');
					if (cells.length === 0) continue; // skip empty rows just in case

					//actully getting to the data
					const entry = {};
					if (cells[0]) entry.assessment = cells[0].innerText.trim();
					if (cells[1]) entry.dueDate = cells[1].innerText.trim();
					if (cells[2]) entry.percentage = cells[2].innerText.trim();
					data.push(entry);
				}
				return data;
			});
			console.log(`Assessment table of ${currCode} extracted`);
			
			//getting the course name
			const paperCode = await page.evaluate(() => {
				const labels = document.querySelectorAll('label.col-md-2');
				for (let label of labels) {
					if (label.innerText.trim() === 'Paper Occurrence Code') {
						const rowDiv = label.closest('.row');
						if (!rowDiv) break;
						const span = rowDiv.querySelector('span.col-md-10');
						if (!span) break;
						return span.innerText.trim();
					}
				}
				return 'UnknownPaper';
			});
			
			//save timetable to JSON file, TO THE DB NOW
			//fs.writeFileSync(fileNameTime, JSON.stringify(timetableData, null, 2));
			for (const item of timetableData) {
				console.log("Saving timetable to DB:", [uid, pid, item.event, item.day, item.startTime, item.endTime, item.location, 1]);
				await db.query(`INSERT INTO user_timetable (uid, pid, name, day, start_time, end_time, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,[uid, pid, item.event, item.day, item.startTime, item.endTime, item.location, 1]);
			}			
			console.log('Saved timetable to database');
			
			//save grade to JSON file
			//fs.writeFileSync(fileNameGrade, JSON.stringify(assessmentData, null, 2));
			for (const task of assessmentData) {
				const percentageValue = parseFloat((task.percentage || '0').replace('%', '')) || 0;
				console.log("Saving assessment to DB:", [uid, pid, task.assessment, percentageValue, 0]);
				await db.query(`INSERT INTO user_assignments (uid, pid, name, weight, grade) VALUES (?, ?, ?, ?, ?)`,[uid, pid, task.assessment, percentageValue, 0]);
			}
			console.log('Saved assessments at database');
			
		} catch (error) {
			console.error('Failed to load the page:', error);
		}
	}
	await browser.close();
	await db.end();
};
//aaint this fun
//its actully fun lol, i like the progress of figuring stuff out
module.exports = scrape;













// fetch("http://localhost:3000/api/scrape/run", {
//   method: "GET",
//   credentials: "include"
// })
//   .then(res => res.json())
//   .then(data => console.log(data))
//   .catch(err => console.error("Request failed:", err));