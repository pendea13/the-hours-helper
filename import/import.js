// import.js
let userProfile = null;

// Function to populate the select dropdown with projects
function populateProjects() {
    const projectSelect = document.getElementById('project-select');
    const activityTooltip = document.getElementById('activity-tooltip');
    // Create a mapping of activity IDs to activity objects
    const activityMap = new Map();

    activityTooltip.innerHTML = 'Activities and Id`s: <br>';

    // Extract projects from userProfile
    const projects = userProfile.userAllocations;

    // Create and append options to the select dropdown
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.projectId; // Use a unique identifier for each project
        option.textContent = project.projectName; // Display project name
        projectSelect.appendChild(option);

        // Iterate through allocationDtos and add unique activities to the mapping
        project.allocationDtos.forEach(activity => {
            if (!activityMap.has(activity.activityId)) {
                activityMap.set(activity.activityId, activity);
            }
        });
    });

    // Convert the values of the activityMap into an array
    const uniqueActivitiesArray = Array.from(activityMap.values());

    uniqueActivitiesArray.forEach(activity => {
        activityTooltip.innerHTML += `${activity.activityName}: ${activity.activityId}<br>`;
    });
}

// Function to handle file upload
function handleFileUpload() {
    const projectSelect = document.getElementById('project-select');
    const csvFile = document.getElementById('csv-file').files[0];

    if (!projectSelect.value) {
        alert('Please select a project.');
        return;
    }

    if (!csvFile) {
        alert('Please select a CSV file to upload.');
        return;
    }

    // Perform further processing with the selected project and CSV file
    const projectId = projectSelect.value;
    // Use FileReader to read the CSV file
    const reader = new FileReader();

    reader.onload = (event) => {
        const csvData = event.target.result;
        const parsedData = parseCSVData(csvData);
        const requestBody = []
        // Retrieve the authToken from local storage
        chrome.storage.sync.get('authToken', (data) => {
            const authToken = data.authToken;

            // Send API requests for each data item
            const project = userProfile.userAllocations.find(project => project.projectId === parseInt(projectId));
            parsedData.forEach(dataItem => {
                if (dataItem.activity_id) {
                    console.log(dataItem.activity_id)
                    const projectModuleId = project.allocationDtos.find(task => task.activityId === parseInt(dataItem.activity_id)).projectModuleId;
                    requestBody.push({
                        end: generateDateTime(dataItem.end_date, dataItem.end_time),
                        start: generateDateTime(dataItem.start_date, dataItem.start_time),
                        activityId: parseInt(dataItem.activity_id),
                        projectId: parseInt(projectId),
                        projectModuleId: parseInt(projectModuleId),
                        task: dataItem.task,
                        employeeId: userProfile.employeeId.toString()
                    })
                }

            });
            sendAPIRequest(requestBody, authToken);
        });
    };

    reader.readAsText(csvFile);
}

function generateDateTime(date, time) {
    return formatDate(new Date(`${date} ${time}`));
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

function calculateTimeDifference(startDateString, endDateString) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);

    const timeDifference = endDate - startDate; // Difference in milliseconds

    const hours = Math.floor(timeDifference / (1000 * 60 * 60)); // Calculate hours
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)); // Calculate minutes

    // Format the result as "XhYm"
    return `${hours}h${minutes}m`;
}

// Function to parse CSV data
function parseCSVData(csvData) {
    // Split the CSV data into rows
    const rows = csvData.split('\n');

    // Assuming the first row contains headers
    const headers = rows[0].split(',');

    // Initialize an array to store the parsed data
    const parsedData = [];

    // Start from the second row (index 1) to skip headers
    for (let i = 1; i < rows.length; i++) {
        const rowData = rows[i].split(',');
        const dataObject = {};

        // Create an object with headers as keys and row values as values
        for (let j = 0; j < headers.length; j++) {
            dataObject[headers[j]] = rowData[j];
        }

        parsedData.push(dataObject);
    }

    return parsedData;
}

function sendAPIRequest(dataItem, authToken) {
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

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Retrieve userProfile data from storage
    chrome.storage.sync.get('userProfile', (data) => {
        userProfile = data.userProfile;

        // Populate the select dropdown with projects
        populateProjects(userProfile);
    });

    // Add click event listener to the upload button
    document.getElementById('upload-button').addEventListener('click', handleFileUpload);
    const csvFileInput = document.getElementById('csv-file');
    csvFileInput.addEventListener('change', (event) => {
        // Get the selected file from the event
        const csvFile = event.target.files[0];

        // Call the populateTable function with the selected file
        populateTable(csvFile);
    });
});

// Function to populate the table with data
function populateTable(csvFile) {
    const projectSelect = document.getElementById('project-select');
    const previewTable = document.getElementById('preview-table');
    const previewTitle = document.getElementById('preview-title');
    const tableHead = previewTable.querySelector('thead');
    const tableBody = previewTable.querySelector('tbody');

    // Clear any existing table content
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    if (!projectSelect.value) {
        return;
    }
    if (!csvFile) {
        return;
    }

    // Perform further processing with the selected project and CSV file
    const projectId = projectSelect.value;
    // Use FileReader to read the CSV file
    const reader = new FileReader();

    reader.onload = (event) => {
        const csvData = event.target.result;
        const parsedData = parseCSVData(csvData);
        const requestBody = []
        parsedData.forEach(dataItem => {
            if (dataItem.activity_id) {
                const project = userProfile.userAllocations.find(project => project.projectId === parseInt(projectId));
                const activity = project.allocationDtos.find(task => task.activityId === parseInt(dataItem.activity_id));
                requestBody.push({
                    Project: project.projectName,
                    "Project Module": activity.moduleName,
                    Activity: activity.activityName,
                    "Start date": generateDateTime(dataItem.start_date, dataItem.start_time),
                    "End date": generateDateTime(dataItem.end_date, dataItem.end_time),
                    Task: dataItem.task,
                    Time: calculateTimeDifference(`${dataItem.start_date} ${dataItem.start_time}`, `${dataItem.end_date} ${dataItem.end_time}`),
                })
            }
        });
        // Create table headers from CSV headers
        const headers = Object.keys(requestBody[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Create table rows and populate data
        requestBody.forEach(dataItem => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const cell = document.createElement('td');
                cell.textContent = dataItem[header];
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });

        // Show the table
        previewTable.style.display = 'block';
        previewTitle.style.display = 'block'
    };
    reader.readAsText(csvFile);
}
