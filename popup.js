// Define variables to store the running task state and task interval ID
let savedCredentials = null;
let userProfile = null;
let runningTask = null;
let runningClock = null;
let taskIntervalId = null;
let authToken = null;
let selectedProject = null;
let selectedActivity = null;
let userAccessDoors = null;
let accessDoorsPreferences = {doorId: null, start: false, stop: false};

// Check if the authToken is stored
function checkAuthToken() {
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
                        .then(userProfileData => {
                            delete userProfileData.photo;
                            userProfile = userProfileData;
                            chrome.storage.sync.set({userProfile});
                        })
                        .catch(error => {
                            console.error('Error parsing response:', error);
                        });
                } else if (response.status === 401 && savedCredentials && savedCredentials.autoLogin) {
                    autoLogin();
                } else {
                    // Token is not valid
                    console.error('Token validation failed');
                    isLoggedOut();
                }
            })
            .catch(error => {
                console.error('Error validating token:', error);
                isLoggedOut();
            });
    } else {
        // Token is not stored, show "Login" button
        isLoggedOut();
    }
}

function isLoggedOut() {
    document.getElementById('logout-button').style.display = 'none';
    document.getElementById('import-button').style.display = 'none';
    document.getElementById('grid-container').style.display = 'none';
    document.getElementById('joke-section').style.display = 'none';
    document.getElementById('login-button').style.display = 'block';
    if (savedCredentials?.autoLogin) {
        savedCredentials.autoLogin = false;
        chrome.storage.sync.set({savedCredentials});
    }
}

function autoLogin() {
    const payload = {
        username: savedCredentials.username,
        password: savedCredentials.password
    };
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
                console.log('Token refreshed.');
                // Login successful, read the response body as JSON
                response.json()
                    .then(data => {
                        // Access the token from the JSON response
                        authToken = data.token;
                        // Save the token in storage
                        chrome.storage.sync.set({authToken: authToken});
                        checkAuthToken();
                        getAccessDoors();
                    })
                    .catch(error => {
                        console.error('Error parsing response:', error);
                        logOut();
                    });
            } else {
                logOut();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function formatDateForRequest(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const trackingDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    const trackingDateTime = `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;
    const trackingTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    return {trackingDate, trackingDateTime, trackingTime};
}

function toggleClock(start = false) {
    const date = formatDateForRequest(new Date());
    const payload = {
        accessType: start ? 1 : 0,
        doorId: parseInt(accessDoorsPreferences.doorId),
        ...date
    }
    console.log(payload);
    // Send a POST request to the API
    fetch('https://thehours.arobs.com/api/userTimeTrackings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}` // Add your auth token here
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (response.status === 200) {
                // Request successful, handle the response as needed
                getRunningClock();
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

function formatClockHours(hours) {
    // Get the integer part (hours) and decimal part (minutes) of the hours
    const hoursInt = Math.floor(hours);
    const minutesDecimal = (hours - hoursInt) * 60;
    const minutesInt = Math.round(minutesDecimal); // Round to the nearest minute

    // Create the formatted string
    const formattedHours = hoursInt + 'h ' + minutesInt + 'm';

    return formattedHours;
}

function updateRunningClockUI() {
    const runningClockInfo = document.getElementById('running-clock-info');
    const formattedDuration = formatClockHours(runningClock.totalHoursPerDay);
    runningClockInfo.innerHTML = `Clock (Running for ${formattedDuration})`;
}

// Function to pad a number with zero if it's a single digit
function padWithZero(number) {
    return number.toString().padStart(2, '0');
}

// Function to calculate the task duration
function calculateTaskDuration() {
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
    if (accessDoorsPreferences.start) {
        toggleClock(true);
    }

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
        if (accessDoorsPreferences.stop) {
            toggleClock();
        }
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

function toggleClockInfo() {
    if (runningClock && runningClock.clocks?.some(clock => clock.exitClocking?.timeTrackingId === 0)) {
        document.getElementById('running-clock-info').style.display = 'block';
        document.getElementById('clock-stop-button').style.display = 'block';
        document.getElementById('clock-start-button').style.display = 'none';
        document.getElementById('door-select').disabled = true;
    } else {
        document.getElementById('running-clock-info').style.display = 'none';
        document.getElementById('clock-stop-button').style.display = 'none';
        document.getElementById('clock-start-button').style.display = 'block';
        document.getElementById('door-select').disabled = false;
    }
}

function populateProjects() {
    const projectSelect = document.getElementById('project-select');
    // Clear existing options
    projectSelect.innerHTML = '';

    // Extract projects from userProfile
    const projects = userProfile ? userProfile.userAllocations : [];

    // Create and append options to the project select dropdown
    projects.forEach((project, i) => {
        const projectOption = document.createElement('option');
        projectOption.value = project.projectId;
        projectOption.textContent = project.projectName;
        if ((runningTask && runningTask.project === project.projectId.toString()) || selectedProject === project.projectId.toString()) {
            projectOption.selected = true;
            if (!selectedProject) {
                selectedProject = project.projectId;
            }
            populateActivities();
        }
        projectSelect.appendChild(projectOption);
    });
}

function populateActivities() {
    const activitySelect = document.getElementById('activity-select');
    activitySelect.innerHTML = '';
    const projects = userProfile ? userProfile.userAllocations : [];
    const project = projects.find(p => p.projectId === parseInt(selectedProject))
    // Create and append options to the activity select dropdown
    project.allocationDtos.forEach(activity => {
        const activityOption = document.createElement('option');
        activityOption.value = activity.activityId;
        activityOption.textContent = activity.activityName;
        if ((runningTask && runningTask.activity === activity.activityId.toString()) || selectedActivity === activity.activityId.toString())
            activityOption.selected = true;
        if (!selectedActivity) {
            selectedActivity = activity.activityId.toString();
        }
        activitySelect.appendChild(activityOption);
    });

}

function populateDoors() {
    const doorSelect = document.getElementById('door-select');
    document.getElementById('clock-stop').checked = accessDoorsPreferences?.stop;
    document.getElementById('clock-start').checked = accessDoorsPreferences?.start;
    doorSelect.innerHTML = '';
    // Create and append options to the activity select dropdown
    userAccessDoors.forEach(door => {
        const doorOption = document.createElement('option');
        doorOption.value = door.doorId;
        doorOption.textContent = door.description;
        if (accessDoorsPreferences && accessDoorsPreferences.doorId === door.doorId.toString()) {
            doorOption.selected = true;
        }
        if (!accessDoorsPreferences.doorId) {
            accessDoorsPreferences.doorId = door.doorId.toString();
            accessDoorsPreferences.start = false;
            accessDoorsPreferences.stop = false;
        }
        doorSelect.appendChild(doorOption);
    });
    toggleClockInfo();
}

// Add event listeners for start and stop buttons
document.getElementById('start-button').addEventListener('click', startTask);
document.getElementById('stop-button').addEventListener('click', stopTask);
document.getElementById('clock-stop-button').addEventListener('click', () => toggleClock());
document.getElementById('clock-start-button').addEventListener('click', () => toggleClock(true));

// Add event listener for the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // Call getRunningTaskFromStorage to check for a running task
    getRunningTaskFromStorage();
    // Retrieve userProfile data from storage
    chrome.storage.sync.get(['userProfile', 'authToken', 'storedProject', 'storedActivity', 'savedCredentials', 'userAccessDoors', 'accessDoorsPreferences'], (data) => {
        userProfile = data.userProfile;
        authToken = data.authToken;
        selectedProject = data.storedProject;
        selectedActivity = data.storedActivity;
        savedCredentials = data.savedCredentials;
        userAccessDoors = data.userAccessDoors;
        accessDoorsPreferences = data.accessDoorsPreferences ?? {doorId: null, start: false, stop: false};
        checkAuthToken();
        if (!userAccessDoors?.length) {
            getAccessDoors();
        } else {
            getRunningClock();
        }
        // Populate projects and activities
        populateProjects();
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

document.getElementById('door-select').addEventListener('change', (event) => {
    // Get the selected door from the event
    accessDoorsPreferences.doorId = event.target.value;
    chrome.storage.sync.set({accessDoorsPreferences});
});

document.getElementById('clock-start').addEventListener('change', (event) => {
    accessDoorsPreferences.start = event.target.checked;
    chrome.storage.sync.set({accessDoorsPreferences});
});

document.getElementById('clock-stop').addEventListener('change', (event) => {
    accessDoorsPreferences.stop = event.target.checked;
    chrome.storage.sync.set({accessDoorsPreferences});
});

function changeProject(project) {
    if (runningTask && runningTask.project !== project) {
        runningTask.project = project;
        storeRunningTaskInStorage();
    }
    selectedProject = project;
    chrome.storage.sync.set({storedProject: selectedProject});
    populateActivities();
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
    selectedActivity = activity;
    chrome.storage.sync.set({storedActivity: selectedActivity});
}

document.getElementById('logout-button').addEventListener('click', logOut);

function logOut() {
    // Handle logout logic (clear token from storage)
    chrome.storage.sync.remove('authToken', () => {
        isLoggedOut();
    });
}

function getAccessDoors() {
    fetch('https://thehours.arobs.com/api/UserAccessDoors', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
        .then(response => {
            if (response.status === 200) {
                // Store the response in the UserAccessDoors variable
                response.json()
                    .then(accessDoors => {
                        userAccessDoors = accessDoors.map(dor => {
                            return {doorId: dor.doorId, description: dor.description}
                        });
                        chrome.storage.sync.set({userAccessDoors});
                        getRunningClock();
                    })
                    .catch(error => {
                        console.error('Error parsing response:', error);
                    });
            } else {
                // Token is not valid
                console.error('Token validation failed');
            }
        })
        .catch(error => {
            console.error('Error validating token:', error);
        });
}

function getRunningClock() {
    fetch('https://thehours.arobs.com/api/today', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
        .then(response => {
            if (response.status === 200) {
                // Store the response in the UserAccessDoors variable
                response.json()
                    .then(response => {
                        runningClock = response;
                        const activeDoor = runningClock.clocks?.find(c => c.exitClocking?.timeTrackingId === 0) ?? null;
                        if (activeDoor) {
                            accessDoorsPreferences.doorId = activeDoor.exitClocking.doorId.toString();
                            chrome.storage.sync.set({accessDoorsPreferences});
                        }
                        populateDoors();
                        updateRunningClockUI();
                    })
                    .catch(error => {
                        console.error('Error parsing response:', error);
                    });
            } else {
                // Token is not valid
                console.error('Token validation failed');
            }
        })
        .catch(error => {
            console.error('Error validating token:', error);
        });
}


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

