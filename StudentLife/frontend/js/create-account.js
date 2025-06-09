document.getElementById('createAccountForm')?.addEventListener('submit', async (e) => {
  //stop the submit button from submitting
  e.preventDefault();

  //get the username and password
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  //send those to the route to check if the username is taken
  const res = await fetch("http://localhost:3000/api/create-account", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  //wait for the route to respond
  const data = await res.json();
  alert(data.message);
  
  //if all good, let the user log in with their new account details
  if (res.ok) {
    window.location.href = "../login.html"; 
  } else {
    console.error("Error:", data.message);
  }
});
