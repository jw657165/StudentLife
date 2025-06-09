Hey David!

Here is the most up to date code we have for Student Life

Here is how you run it!

You need to download XAMPP https://www.apachefriends.org/

You then need to start MySQL2, and make a new database called 'student_tools'

In that database, start by running the file SQL_TABLES
Then, SQL_PAPERS
Then, SQL_DUMMY_DATA (we are using dummy data at this stage because of the scraping tool not linking to the selection button) (this is mentioned in the report)

Now go download the StudentLife folder into the directoy path/xampp/htdocs

now enter the back end path/StudentLife/backend

now run the command 'npm install'
  This should install all dependencies, but if not here is the list to install manually
    express, express-session, cors, mysql2, puppetteer

now start the XAMPP apache and sql

now start the server using 'node server.js' in that same directory

now you should be running locally on 'http://localhost/StudentLife'
