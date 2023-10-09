// Define variables to store the running task state and task interval ID
let userProfile = null;
let runningTask = null;
let taskIntervalId = null;
let authToken = null;
// Check if the authToken is stored
chrome.storage.sync.get('authToken', (data) => {
    authToken = data.authToken;
    if (authToken) {
        // Token is stored, show "Logout" button and "Import" button
        document.getElementById('logout-button').style.display = 'block';
        document.getElementById('import-button').style.display = 'block';
        document.getElementById('grid-container').style.display = 'grid';
        document.getElementById('joke-section').style.display = 'grid';
        document.getElementById('login-button').style.display = 'none';

        // Validate the token with a GET request
        fetch('https://thehours.arobs.com/api/userprofile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
            .then(response => {
                if (response.status === 200) {
                    // Token is valid, user is authenticated
                    // Store the response in the userProfile variable
                    response.json()
                        .then(userProfile => {
                            delete userProfile.photo;

                            chrome.storage.sync.set({userProfile: userProfile});
                        })
                        .catch(error => {
                            console.error('Error parsing response:', error);
                        });
                } else {
                    // Token is not valid
                    console.log('Token validation failed');
                    document.getElementById('logout-button').style.display = 'none';
                    document.getElementById('import-button').style.display = 'none';
                    document.getElementById('grid-container').style.display = 'none';
                    document.getElementById('joke-section').style.display = 'none';
                    document.getElementById('login-button').style.display = 'block';

                }
            })
            .catch(error => {
                console.error('Error validating token:', error);
                document.getElementById('logout-button').style.display = 'none';
                document.getElementById('import-button').style.display = 'none';
                document.getElementById('grid-container').style.display = 'none';
                document.getElementById('joke-section').style.display = 'none';
                document.getElementById('login-button').style.display = 'block';
            });
    } else {
        // Token is not stored, show "Login" button
        document.getElementById('logout-button').style.display = 'none';
        document.getElementById('import-button').style.display = 'none';
        document.getElementById('grid-container').style.display = 'none';
        document.getElementById('joke-section').style.display = 'none';
        document.getElementById('login-button').style.display = 'block';
    }
});

// Function to store the running task in Chrome storage
function storeRunningTaskInStorage() {
    chrome.storage.sync.set({runningTask});
}

// Function to update UI with the running task's details
function updateRunningTaskUI() {
    const runningTaskInfo = document.getElementById('running-task-info');
    const durationInSeconds = calculateTaskDuration();

    // Format the elapsed time in hh:mm:ss
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = durationInSeconds % 60;

    const formattedDuration = `${padWithZero(hours)}:${padWithZero(minutes)}:${padWithZero(seconds)}`;

    runningTaskInfo.innerHTML = `Task: ${runningTask.task} <br> (Running for ${formattedDuration})`;
}

// Function to pad a number with zero if it's a single digit
function padWithZero(number) {
    return number.toString().padStart(2, '0');
}

// Function to calculate the task duration
function calculateTaskDuration() {
    console.log(runningTask)
    const currentTime = new Date();
    const startTime = new Date(runningTask.startTime);
    return Math.floor((currentTime - startTime) / 1000);
}

// Function to start the task timer
function startTaskTimer() {
    taskIntervalId = setInterval(updateRunningTaskUI, 1000); // Update UI every second
}

// Function to stop the task timer
function stopTaskTimer() {
    clearInterval(taskIntervalId);
}

// Function to start a task
function startTask() {
    const project = document.getElementById('project-select').value;
    const activity = document.getElementById('activity-select').value;
    const task = document.getElementById('task-input').value;

    // Store the running task
    runningTask = {
        project,
        activity,
        task,
        startTime: new Date().toString(),
    };

    // Store the running task in Chrome storage
    storeRunningTaskInStorage();

    // Start the task timer
    toggleRunningTaskInfo();
    startTaskTimer();
    // Update UI to show the running task
    updateRunningTaskUI();
}

// Function to retrieve the running task from storage (if exists) and update UI
function getRunningTaskFromStorage() {
    chrome.storage.sync.get('runningTask', (data) => {
        const storedRunningTask = data.runningTask;
        if (storedRunningTask && storedRunningTask.startTime) {
            // Update the runningTask variable
            runningTask = storedRunningTask;
            // Start the task timer
            startTaskTimer();
            // Update UI to show the running task
            updateRunningTaskUI();
        }
        toggleRunningTaskInfo();
    });
}

// Function to stop the running task
function stopTask() {
    if (runningTask) {
        const project = userProfile.userAllocations.find(project => project.projectId === parseInt(runningTask.project));
        const projectModuleId = project.allocationDtos.find(task => task.activityId === parseInt(runningTask.activity)).projectModuleId;
        sendAPIRequest([{
            end: formatDate(new Date()),
            start: formatDate(new Date(runningTask.startTime)),
            activityId: parseInt(runningTask.activity),
            projectId: parseInt(runningTask.project),
            projectModuleId: parseInt(projectModuleId),
            task: runningTask.task,
            employeeId: userProfile.employeeId
        }]);
        // Clear the running task state
        runningTask = null;
        // Stop the task timer
        stopTaskTimer();
        // Remove the running task from Chrome storage
        chrome.storage.sync.remove('runningTask');
        toggleRunningTaskInfo();
    }
}

function sendAPIRequest(dataItem) {
    // Send a POST request to the API
    fetch('https://thehours.arobs.com/api/UserEvents', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}` // Add your auth token here
        },
        body: JSON.stringify(dataItem)
    })
        .then(response => {
            if (response.status === 200) {
                // Request successful, handle the response as needed
                console.log('API Request Successful');
            } else {
                // Request failed, handle the error
                console.error('API Request Failed');
            }
        })
        .catch(error => {
            console.error('Error sending API request:', error);
        });
}
function formatDate(date) {
    return (
        [
            padTo2Digits(date.getMonth() + 1),
            padTo2Digits(date.getDate()),
            date.getFullYear(),
        ].join('-') +
        ' ' +
        [
            padTo2Digits(date.getHours()),
            padTo2Digits(date.getMinutes()),
            padTo2Digits(date.getSeconds()),
        ].join(':')
    );
}

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function toggleRunningTaskInfo() {
    if (runningTask) {
        document.getElementById('running-task-info').style.display = 'block';
        document.getElementById('stop-button').style.display = 'block';
        document.getElementById('start-button').style.display = 'none';
    } else {
        document.getElementById('running-task-info').style.display = 'none';
        document.getElementById('stop-button').style.display = 'none';
        document.getElementById('start-button').style.display = 'block';
    }
}

function populateProjectsAndActivities() {
    const projectSelect = document.getElementById('project-select');
    const activitySelect = document.getElementById('activity-select');

    // Clear existing options
    projectSelect.innerHTML = '';
    activitySelect.innerHTML = '';

    // Extract projects from userProfile
    const projects = userProfile.userAllocations;

    // Create and append options to the project select dropdown
    projects.forEach((project, i) => {
        const projectOption = document.createElement('option');
        projectOption.value = project.projectId;
        projectOption.textContent = project.projectName;
        if ((runningTask && runningTask.project === project.projectId.toString()) || (!runningTask && i === 0)) {
            projectOption.selected = true;
            // Create and append options to the activity select dropdown
            project.allocationDtos.forEach(activity => {
                const activityOption = document.createElement('option');
                activityOption.value = activity.activityId;
                activityOption.textContent = activity.activityName;
                if (runningTask && runningTask.activity === activity.activityId.toString())
                    activityOption.selected = true;
                activitySelect.appendChild(activityOption);
            });
        }
        projectSelect.appendChild(projectOption);
    });
}

// Add event listeners for start and stop buttons
document.getElementById('start-button').addEventListener('click', startTask);
document.getElementById('stop-button').addEventListener('click', stopTask);

// Add event listener for the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // Call getRunningTaskFromStorage to check for a running task
    getRunningTaskFromStorage();
    // Retrieve userProfile data from storage
    chrome.storage.sync.get('userProfile', (data) => {
        userProfile = data.userProfile;
        // Populate projects and activities
        populateProjectsAndActivities();
        onLoad();
    });
});

function onLoad() {
    if (runningTask) {
        const task = document.getElementById('task-input');
        // Set the default selected project
        task.value = runningTask.task;
        // Trigger the change event on the project-select element to update the UI
        const event = new Event('change', {
            bubbles: true,
            cancelable: true,
        });
        task.dispatchEvent(event);
    }

}

// Add click event listeners to the buttons
document.getElementById('login-button').addEventListener('click', () => {
    // Handle login logic or redirect to the login page
    chrome.tabs.create({url: 'login/login.html'});
});
document.getElementById('import-button').addEventListener('click', () => {
    chrome.tabs.create({url: 'import/import.html'});
});
document.getElementById('project-select').addEventListener('change', (event) => {
    // Get the selected project from the event
    const project = event.target.value;
    // Call the changeProject function with the selected project
    changeProject(project);
});
document.getElementById('task-input').addEventListener('change', (event) => {
    // Get the selected task from the event
    const task = event.target.value;
    // Call the changeTask function with the selected task
    changeTask(task);
});
document.getElementById('activity-select').addEventListener('change', (event) => {
    // Get the selected activity from the event
    const activity = event.target.value;
    // Call the changeActivity function with the selected activity
    changeActivity(activity);
});

function changeProject(project) {
    if (runningTask && runningTask.project !== project) {
        runningTask.project = project;
        storeRunningTaskInStorage();
    }
}

function changeTask(task) {
    if (runningTask && runningTask.task !== task) {
        runningTask.task = task;
        storeRunningTaskInStorage();
    }
}

function changeActivity(activity) {
    if (runningTask && runningTask.activity !== activity) {
        runningTask.activity = activity;
        storeRunningTaskInStorage();
    }
}

document.getElementById('logout-button').addEventListener('click', () => {
    // Handle logout logic (clear token from storage)
    chrome.storage.sync.remove('authToken', () => {
        document.getElementById('logout-button').style.display = 'none';
        document.getElementById('import-button').style.display = 'none';
        document.getElementById('grid-container').style.display = 'none';
        document.getElementById('joke-section').style.display = 'none';
        document.getElementById('login-button').style.display = 'block';
    });
});

// Function to fetch a short joke from JokeAPI
function fetchShortJoke() {
    const jokeText = document.getElementById('joke-text');
    const getJokeButton = document.getElementById('get-joke-button');

    // Disable the "Get Joke" button while fetching a joke
    getJokeButton.disabled = true;
    jokeText.textContent = 'Loading a joke...';

    // Fetch a joke from the JokeAPI
    fetch('https://v2.jokeapi.dev/joke/Any?type=single')
        .then(response => response.json())
        .then(data => {
            if (data && data.joke) {
                // Display the fetched joke
                jokeText.textContent = data.joke;
            } else {
                jokeText.textContent = 'Failed to fetch a joke. Please try again later.';
            }

            // Re-enable the "Get Joke" button
            getJokeButton.disabled = false;
        })
        .catch(error => {
            console.error('Error fetching joke:', error);
            jokeText.textContent = 'Failed to fetch a joke. Please try again later.';
            getJokeButton.disabled = false;
        });
}

// Add a click event listener to the "Get Joke" button
document.getElementById('get-joke-button').addEventListener('click', fetchShortJoke);

// Fetch and display an initial short joke when the popup is opened
fetchShortJoke();

