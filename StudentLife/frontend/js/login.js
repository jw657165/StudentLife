document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  //stop the submit button from submitting right away
  e.preventDefault();
  
  //get the username and password
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  //pass the login details to the route to check for log in
  const res = await fetch("http://localhost:3000/api/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  //wait for the response
  const data = await res.json();
  alert(data.message);

  //log into the index page
  if (res.ok) {
    window.location.href = "pages/index.html"; 
  }
});
