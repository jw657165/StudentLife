const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');

//start the express server and set the port we will use
const app = express();
const port = 3000;


//middleware
//this is for the frontend to interact with the backend
//be sure to include credentials so that we can store the current logged in user
app.use(cors({
  origin: 'http://localhost',
  credentials: true
}));
app.use(express.json());

//create the session to allow for storing of the current user
app.use(session({
  secret: '1234', 
  resave: false,
  saveUninitialized: true,
}));

//MySQL connection setup
//making use of XAMPP
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'student_tools'
});

//connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed:', err);
  } else {
    console.log('Connected to MySQL');
  }
});


//===============
//timetable routes
//===============

//use the current logged in user id to query the database and get the active papers of that user
app.get('/api/timetable', (req, res) => {
  console.log(req.session.userId);
  db.query(
    'SELECT name, day, start_time, end_time, description, is_active FROM user_timetable WHERE uid = ?',
    [req.session.userId], 
    (err, results) => {
      if (err) {
        res.status(500).json({ error: 'DB error' });
      } else {
        res.json(results);
      }
    }
  );
});

//when adding a paper to the timetable, take the given variables and insert into db
app.post('/api/timetable/add', (req, res) => {
  console.log(req.body);

  //get the data from the request
  const { name, day, start_time, end_time } = req.body;
  const uid = req.session.userId;

  //check for log in
  if (!uid) return res.status(401).json({ error: "Not logged in" });

  //maybe help with formating
  const formattedStart = `${String(start_time).padStart(2, '0')}:00:00`;
  const formattedEnd = `${String(end_time).padStart(2, '0')}:00:00`;

  //insert into db
  db.query(
    "INSERT INTO user_timetable (uid, name, day, start_time, end_time, is_active, description) VALUES (?, ?, ?, ?, ?, 1, '')",
    [uid, name, day, formattedStart, formattedEnd],
    (err) => {
      if (err) return res.status(500).json({ error: "Insert failed" });
      res.json({ message: "Class added" });
    }
  );
});


//when moving a timetable item from in the timetable to the removed section, update the is_active in the db
//in theory i think this is supposed to be a put request, but it works and i am too scared to change it
app.post('/api/timetable/update-active', (req, res) => {
  console.log(req.body);

  //get information from the 
  const { name, day, start_time, is_active } = req.body;
  const uid = req.session.userId;

  //weird error, but the time only got sent for the double digit times
  //it broke for the 8 and 9am times, so they need to be padded 
  // the database has them as 08:00. and 09:00.
  const paddedTime = String(start_time).padStart(2, '0');

  if (!uid) return res.status(401).json({ error: "Not logged in" });

  //change thidslhigvsdjkflvgfjnxfkjbgjkfx
  const formatTime = (t) => {
    const h = typeof t === "string" ? parseInt(t) : t;
    return `${String(h).padStart(2, '0')}:00:00`;
  };

const formattedStart = formatTime(start_time);

  //update the database by checking uid, name, day and time
  db.query(
    "UPDATE user_timetable SET is_active = ? WHERE uid = ? AND name = ? AND day = ? AND start_time LIKE ?",
    [is_active, uid, name, day, `${formattedStart}%`],
    (err) => {
      if (err) return res.status(500).json({ error: "Update failed" });
      res.json({ message: "Status updated" });
    }
  );
});


//===============
//log in routes
//===============

//when logging in, check that the username and password match
//then set the session id to that user id
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  //get the database information from the username
  db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    //check that user exists
    if (results.length === 0) return res.status(401).json({ message: "User not found" });

    const user = results[0];

    //check that the passwords match
    if (password === user.password) {
      //set the session id to the uid
      req.session.userId = user.uid;

      console.log(req.session.userId);

      return res.json({ message: "Login successful" });
    } else {
      return res.status(401).json({ message: "Incorrect password" });
    }
  });
});

//check which user is logged in
app.get("/api/loggedin", (req, res) => {
  //if there is no one logged in, say that
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }
  //if someone is logged in, who is it?
  res.json({ uid: req.session.userId });
});


//allow user to create new account, ensuring no duplicate usernames
app.post("/api/create-account", (req, res) => {
  const { username, password } = req.body;

  //get all accounts with that username, if there are none, then thats okay
  db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (results.length !== 0) {
      return res.status(401).json({ message: "Account exists with this username already" });
    }

    //insert new user into the database
    db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err, result) => {
      if (err) return res.status(500).json({ message: "Error creating account" });

      return res.status(201).json({ message: "Account created successfully" });
    });
  });
});


//===============
//grade calculator routes
//===============


//get all active papers of a user and return the paper id along with it
app.get('/api/grades/papers', (req, res) => {
  //get paper id from user_papers using the user id
  //then get the paper code from the papers table where the paper id is the same as in the user_papers
  db.query(
    'SELECT paper_code, pid FROM papers WHERE pid IN (SELECT pid FROM user_papers WHERE is_active = 1 AND uid = ?)',
    [req.session.userId],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: 'DB error' });
      } else {
        res.json(results);
      }
    }
  )
});


//use this route by sending the pid in the url as a parameter
//this will get all assignments  that are related to the parameter and the logged in user
app.get('/api/grades/assignments/:pid', (req, res) => {
  const pid = req.params.pid;

  db.query(
    'SELECT id, name, weight, grade FROM user_assignments WHERE pid = ? AND uid = ?',
    [pid, req.session.userId],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: 'DB error' });
      } else {
        res.json(results);
      }
    }
  )
});


//use thus route by sending the assignment id as a parameter in the url
//this will update the grade of a certain assignment
app.put('/api/grades/assignments/:assignmentId', (req, res) => {
  const assignmentId = req.params.assignmentId;
  const newGrade = req.body.grade;
  const uid = req.session.userId;

  if (!uid) return res.status(401).json({ error: 'Not logged in' });

  //find the assignment with the id, but just in case something goes wrong, also include the user id
  db.query(
    'UPDATE user_assignments SET grade = ? WHERE id = ? AND uid = ?',
    [newGrade, assignmentId, uid],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true });
    }
  );
});


//===============
//degree planner routes
//===============

//get all papers from the paper table and order them by year, then type, then code
app.get('/api/papers', (req, res) => {
  db.query(
    'SELECT * FROM papers ORDER BY year ASC, paper_type ASC, paper_code ASC',
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
});



//===============
//scraping routes
//===============

//this will employ the scraping tool, it just needs to call the function and update the console when it finishes
//the scraping tool does all the database updates and what not
app.get("/api/scrape/run", async (req, res) => {
  const uid = req.session.userId;
  if (!uid) return res.status(401).json({ error: "Not logged in" });

  try {
    const scrape = require("./scrape"); 
    await scrape(uid); 
    res.json({ message: "Scraping complete" });
  } catch (err) {
    console.error(err);
    console.error("SCRAPE ERROR:", err);
    res.status(500).json({ error: "Scraping failed" });
  }
});

//older version of getting the select button to work.
//we are keeping it for future reference but it does not do anything right now

// app.post('/api/papers/activate', (req, res) => {
//   const uid = req.session.userId;
//   const selected = req.body.selected; // Array of paper_code strings

//   console.log("UID from session:", uid);
//   console.log("Selected paper codes:", selected);

//   if (!uid || !Array.isArray(selected) || selected.length === 0) {
//     return res.status(400).json({ error: "Bad request" });
//   }

//   const placeholders = selected.map(() => '?').join(',');
//   const getPidSql = `SELECT pid FROM papers WHERE paper_code IN (${placeholders})`;

//   db.query(getPidSql, selected, (err, results) => {
//     if (err) {
//       console.error("PID SELECT ERROR:", err);
//       return res.status(500).json({ error: "Failed to map paper codes" });
//     }

//     const pids = results.map(r => r.pid);
//     console.log("Mapped PIDs:", pids);

//     if (pids.length === 0) {
//       console.warn("No matching PIDs for selected codes:", selected);
//       return res.status(400).json({ error: "No matching papers found" });
//     }


//     db.query("UPDATE user_papers SET is_active = 0 WHERE uid = ?", [uid], (clearErr) => {
//       if (clearErr) {
//         console.error("RESET ERROR:", clearErr);
//         return res.status(500).json({ error: "Failed to reset active states" });
//       }

//       const pidPlaceholders = pids.map(() => '?').join(',');
//       const updateSql = `UPDATE user_papers SET is_active = 1 WHERE uid = ? AND pid IN (${pidPlaceholders})`;
//       const params = [uid, ...pids];

//       console.log("Final SQL:", updateSql);
//       console.log("Params:", params);

//       db.query(updateSql, params, (updateErr) => {
//         if (updateErr) {
//           console.error("UPDATE ERROR:", updateErr);
//           return res.status(500).json({ error: "DB update failed" });
//         }

//         console.log("Successfully activated papers.");
//         res.json({ message: "Papers activated successfully" });
//       });
//     });
//   });
// });


//start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



