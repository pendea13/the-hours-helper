// login.js

// Function to handle the login form submission
function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const saveCredentials = document.getElementById('save-credentials').checked;
    const autoLogin = document.getElementById('auto-login').checked;
    // Create a JSON payload with the username and password
    const payload = {
        username: username,
        password: password
    };
    console.log('api Call');
    // Make a POST request to the API
    fetch('https://thehours.arobs.com/api/user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (response.status === 200) {
                // Login successful, read the response body as JSON
                response.json()
                    .then(data => {
                        // Access the token from the JSON response
                        const authToken = data.token;
                        if (saveCredentials) {
                            chrome.storage.sync.set({ savedCredentials: {...payload, autoLogin} });
                        }
                        // Save the token in storage
                        chrome.storage.sync.set({ authToken: authToken }, () => {
                            // Redirect or show other content as needed

                            chrome.tabs.getCurrent(function(tab) {
                                chrome.tabs.remove(tab.id);
                            });
                        });
                    })
                    .catch(error => {
                        console.error('Error parsing response:', error);
                    });
            } else {
                // Login failed, display an error message
                const errorMessage = document.getElementById('error-message');
                errorMessage.textContent = 'Login failed. Please check your credentials.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Function to populate the login form fields with saved credentials
function populateLoginFields() {
    chrome.storage.sync.get('savedCredentials', (data) => {
        const savedCredentials = data.savedCredentials;
        if (savedCredentials) {
            document.getElementById('username').value = savedCredentials.username;
            document.getElementById('password').value = savedCredentials.password;
            document.getElementById('save-credentials').checked = true;
            document.getElementById('auto-login').checked = savedCredentials.autoLogin;
        }
    });
}

// Add a click event listener to the login button
document.getElementById('login-button').addEventListener('click', handleLogin);

// Call the populateLoginFields function when the page loads
document.addEventListener('DOMContentLoaded', populateLoginFields);
