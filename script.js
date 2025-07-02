document.getElementById('uploadButton').addEventListener('click', () => {
    document.getElementById('csvFileInput').click();
});

document.getElementById('csvFileInput').addEventListener('change', handleFileSelect);

const trainingRequirements = {
    "P8 SPL/II 1": { "duo_flights": 1 },
    "P8 SPL/II 2": { "duo_flights": 5 },
    "P8 SPL/II 3": { "duo_flights": 10 },
    "P8 SPL/II 4": { "duo_flights": 6 },
    "P8 SPL/II 5": { "duo_flights": 2 },
    "P8 SPL/II 6": { "duo_flights": 4 },
    "P8 SPL/II 7": { "duo_flights": 2 },
    "P8 SPL/II 8": { "solo_flights": 5 },
    "P8 SPL/IV 1": { "duo_flights": 3, "solo_flights": 6 },
    "P8 SPL/IV 2": { "duo_flights": 3, "solo_flights": 2 },
    "P8 SPL/IV 3": { "duo_flights": 2, "solo_flights": 2 },
    "P8 SPL/IV 4": { "duo_flights": 2 },
    "P8 SPL/V 1": {
        "duo_flights": 3, "duo_time_minutes": 300,
        "solo_flights": 3, "solo_time_minutes": 180
    }
};

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('fileNameLabel').textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const { pilotData, pilotName, error } = analyzeFlightData(e.target.result);
            if (error) {
                displayError(error);
            } else {
                document.getElementById('pilotNameHeader').textContent = `Pilot: ${pilotName}`;
                displayReport(pilotData);
            }
        } catch (error) {
            console.error("Error processing file:", error);
            displayError(error.message);
        }
    };
    reader.readAsText(file);
}

function analyzeFlightData(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) {
        return { error: "CSV file is empty or has no data rows." };
    }
    
    const pilotSummary = {};
    let pilotName = null;

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(';');
        if (columns.length < 16) continue;

        if (!pilotName) {
            pilotName = columns[5]?.trim() || 'Unknown';
        }

        const taskZad = columns[8]?.trim() || '';
        const taskCw = columns[9]?.trim() || '';
        const standardTaskName = `${taskZad} ${taskCw}`.trim();

        let targetTasks = [standardTaskName];
        if (taskZad === "P8 SPL IV- SPL V") {
            targetTasks = ["P8 SPL/IV 4", "P8 SPL/V 1"];
        }

        const flightTimeMinutes = parseTimeToMinutes(columns[15]?.trim());
        const isDuo = (columns[6]?.trim() || '') !== '';

        targetTasks.forEach(target => {
            if (!pilotSummary[target]) {
                pilotSummary[target] = {
                    solo_flights: 0, duo_flights: 0,
                    solo_time_minutes: 0, duo_time_minutes: 0
                };
            }
            if (isDuo) {
                pilotSummary[target].duo_flights += 1;
                pilotSummary[target].duo_time_minutes += flightTimeMinutes;
            } else {
                pilotSummary[target].solo_flights += 1;
                pilotSummary[target].solo_time_minutes += flightTimeMinutes;
            }
        });
    }
    return { pilotData: pilotSummary, pilotName: pilotName, error: null };
}

function displayReport(pilotData) {
    const container = document.getElementById('reportContainer');
    container.innerHTML = '';

    Object.keys(trainingRequirements).sort().forEach(task => {
        const reqs = trainingRequirements[task];
        const actuals = pilotData[task] || {};

        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';

        const taskTitle = document.createElement('h3');
        taskTitle.className = 'task-title';
        taskTitle.textContent = task;
        taskCard.appendChild(taskTitle);

        Object.keys(reqs).forEach(reqKey => {
            const isTime = reqKey.includes('time');
            const requiredValue = reqs[reqKey];
            const actualValue = actuals[reqKey] || 0;

            let progress = requiredValue > 0 ? actualValue / requiredValue : 0;
            progress = Math.min(progress, 1.0);
            
            const isMet = progress >= 1.0;
            const statusIcon = isMet ? '✅' : '❌';
            const progressBarClass = isMet ? 'met' : 'not-met';

            const line = document.createElement('div');
            line.className = 'requirement-line';

            const label = document.createElement('span');
            label.className = 'requirement-label';
            
            let labelText;
            if (reqKey === 'duo_flights') {
                labelText = 'Z Instruktorem';
            } else if (reqKey === 'solo_flights') {
                labelText = 'Solo';
            } else if (reqKey === 'duo_time_minutes') {
                labelText = 'Czas z Instruktorem';
            } else if (reqKey === 'solo_time_minutes') {
                labelText = 'Czas Solo';
            }

            if (isTime) {
                label.textContent = `${statusIcon} ${labelText}: ${formatMinutesToHHMM(actualValue)} / ${formatMinutesToHHMM(requiredValue)}`;
            } else {
                label.textContent = `${statusIcon} ${labelText}: ${actualValue} / ${requiredValue}`;
            }

            const progressBar = document.createElement('progress');
            progressBar.value = progress;
            progressBar.max = 1;
            progressBar.className = progressBarClass;

            line.appendChild(label);
            line.appendChild(progressBar);
            taskCard.appendChild(line);
        });

        container.appendChild(taskCard);
    });
}

function displayError(message) {
    const container = document.getElementById('reportContainer');
    document.getElementById('pilotNameHeader').textContent = '';
    container.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'placeholder';
    errorDiv.style.color = 'red';
    errorDiv.textContent = `An error occurred: ${message}`;
    container.appendChild(errorDiv);
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return (hours * 60) + minutes;
}

function formatMinutesToHHMM(totalMinutes) {
    if (isNaN(totalMinutes)) return "00:00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}`;
}