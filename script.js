document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const newTaskInput = document.getElementById('newTaskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const timerDisplay = document.getElementById('timerDisplay');
    const timerStatus = document.getElementById('timerStatus');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const pauseTimerBtn = document.getElementById('pauseTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    const currentTaskInfo = document.getElementById('currentTaskInfo');

    // --- Timer Variables ---
    let timerInterval;
    let timeRemaining = 25 * 60; // Default: 25 minutes for Pomodoro
    let isPaused = true;
    let currentPhase = 'focus'; // 'focus', 'shortBreak', 'longBreak'
    let pomodoroCount = 0; // Pomodoros completed in the current cycle
    const FOCUS_TIME = 25 * 60; // 25 minutes
    const SHORT_BREAK_TIME = 5 * 60; // 5 minutes
    const LONG_BREAK_TIME = 15 * 60; // 15 minutes
    const POMODOROS_BEFORE_LONG_BREAK = 4;

    // --- Task Variables ---
    // Load tasks from local storage, or initialize as an empty array
    let tasks = JSON.parse(localStorage.getItem('productivityHubTasks')) || [];
    let selectedTaskId = null; // ID of the currently selected task for Pomodoro

    // --- Functions ---

    // Utility to show custom alerts instead of native alert()
    const showCustomAlert = (message, duration = 2000) => {
        let alertBox = document.querySelector('.alert-message');
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.className = 'alert-message';
            document.body.appendChild(alertBox);
        }
        alertBox.textContent = message;
        alertBox.classList.add('show');

        setTimeout(() => {
            alertBox.classList.remove('show');
        }, duration);
    };

    // Saves tasks array to local storage
    const saveTasks = () => {
        localStorage.setItem('productivityHubTasks', JSON.stringify(tasks));
    };

    // Renders the task list dynamically
    const renderTasks = () => {
        taskList.innerHTML = ''; // Clear existing tasks
        if (tasks.length === 0) {
            // Display a message if no tasks exist
            taskList.innerHTML = '<li class="text-gray-500 text-center py-4 text-base italic">No tasks yet! Add one above.</li>';
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            // Apply Tailwind classes for styling based on task status and selection
            li.className = `task-item flex items-center justify-between p-3 rounded-xl shadow-sm cursor-pointer transition duration-200 ease-in-out 
                           ${task.completed ? 'bg-green-100 text-gray-500 line-through' : 'bg-gray-50 hover:bg-gray-200'} 
                           ${task.id === selectedTaskId ? 'border-2 border-primary-blue bg-blue-50' : ''}`;
            li.dataset.id = task.id; // Store task ID on the list item

            // Inner HTML structure for each task item
            li.innerHTML = `
                <div class="flex items-center flex-grow">
                    <input type="checkbox" class="task-checkbox mr-3 h-5 w-5 text-secondary-green rounded focus:ring-secondary-green cursor-pointer" ${task.completed ? 'checked' : ''}>
                    <span class="task-text flex-grow text-gray-800 text-lg">${task.text}</span>
                    <span class="ml-2 text-sm text-gray-600 font-medium">${task.pomodorosCompleted} Pomodoros</span>
                </div>
                <div class="flex items-center ml-4 space-x-2">
                    <button class="select-task-btn bg-blue-200 text-primary-blue p-2 rounded-full hover:bg-blue-300 transition duration-300 ease-in-out text-sm w-8 h-8 flex items-center justify-center" title="Select Task">
                        <i class="fas fa-hand-pointer"></i>
                    </button>
                    <button class="delete-task-btn text-red-500 hover:text-red-700 p-2 rounded-full transition duration-300 ease-in-out w-8 h-8 flex items-center justify-center" title="Delete Task">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            taskList.appendChild(li);
        });
        updateCurrentTaskInfo(); // Update info about the task currently linked to Pomodoro
    };

    // Adds a new task to the list
    const addTask = () => {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            // Create a unique ID for the new task
            const newTask = {
                id: Date.now().toString(),
                text: taskText,
                completed: false,
                pomodorosCompleted: 0
            };
            tasks.push(newTask); // Add to tasks array
            newTaskInput.value = ''; // Clear input field
            saveTasks(); // Persist tasks
            renderTasks(); // Update UI
        } else {
            showCustomAlert('Please enter a task!', 1500);
        }
    };

    // Handles click events on the task list (checkbox, delete, select)
    const handleTaskClick = (event) => {
        const target = event.target;
        const listItem = target.closest('li'); // Find the closest parent <li>
        if (!listItem) return; // If no <li> found, exit

        const taskId = listItem.dataset.id;
        const taskIndex = tasks.findIndex(task => task.id === taskId); // Find task by ID

        if (target.classList.contains('task-checkbox')) {
            // Toggle task completion status
            tasks[taskIndex].completed = target.checked;
            saveTasks();
            renderTasks();
            showCustomAlert(`Task "${tasks[taskIndex].text}" ${tasks[taskIndex].completed ? 'completed!' : 'reopened.'}`);
        } else if (target.closest('.delete-task-btn')) {
            // Delete task confirmation and action
            const confirmDelete = confirm(`Are you sure you want to delete "${tasks[taskIndex].text}"?`);
            if (confirmDelete) {
                if (selectedTaskId === taskId) {
                    // If the deleted task was the selected Pomodoro task, reset the timer
                    selectedTaskId = null;
                    resetTimer();
                }
                tasks.splice(taskIndex, 1); // Remove task from array
                saveTasks();
                renderTasks();
                showCustomAlert('Task deleted.', 1500);
            }
        } else if (target.closest('.select-task-btn') || target.classList.contains('task-text')) {
            // Select task for Pomodoro timer
            if (selectedTaskId === taskId) {
                // If already selected, deselect it
                selectedTaskId = null;
                updateCurrentTaskInfo(); // Clear selected task info
                showCustomAlert('Task deselected from Pomodoro.', 1500);
            } else {
                // Select new task
                selectedTaskId = taskId;
                updateCurrentTaskInfo(); // Update selected task info
                showCustomAlert(`"${tasks[taskIndex].text}" selected for Pomodoro.`, 1500);
                // If timer is running and a new task is selected, reset and prepare for new task
                if (!isPaused) {
                    resetTimer(); // Reset but don't auto-start
                    setTimerPhase('focus'); // Ensure it's focus time
                    startTimerBtn.classList.remove('hidden'); // Show start button
                    pauseTimerBtn.classList.add('hidden'); // Hide pause button
                } else {
                    // If paused, just update info and prepare timer for the selected task
                    setTimerPhase('focus'); // Ensure it starts as focus time
                }
            }
            renderTasks(); // Re-render to update highlight
        }
    };

    // Updates the display showing which task is currently linked to the Pomodoro
    const updateCurrentTaskInfo = () => {
        if (selectedTaskId) {
            const selectedTask = tasks.find(task => task.id === selectedTaskId);
            if (selectedTask) {
                currentTaskInfo.textContent = `Focusing on: "${selectedTask.text}"`;
            } else {
                // Task might have been deleted, clear selection
                selectedTaskId = null;
                currentTaskInfo.textContent = 'No task selected for Pomodoro. Select a task from above.';
            }
        } else {
            currentTaskInfo.textContent = 'No task selected for Pomodoro. Select a task from above.';
        }
    };

    // Formats seconds into MM:SS format for display
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Updates the timer display text
    const updateTimerDisplay = () => {
        timerDisplay.textContent = formatTime(timeRemaining);
    };

    // Sets the current phase of the Pomodoro timer (focus, short break, long break)
    const setTimerPhase = (phase) => {
        currentPhase = phase;
        // Update timer status text and display time based on phase
        switch (phase) {
            case 'focus':
                timeRemaining = FOCUS_TIME;
                timerStatus.textContent = 'Focus Time';
                // Remove existing color classes and add new one
                timerDisplay.classList.remove('text-secondary-green', 'text-danger-red');
                timerDisplay.classList.add('text-white'); // Time capsule timer always uses white text
                break;
            case 'shortBreak':
                timeRemaining = SHORT_BREAK_TIME;
                timerStatus.textContent = 'Short Break';
                timerDisplay.classList.remove('text-white', 'text-danger-red');
                timerDisplay.classList.add('text-secondary-green'); // Apply green for short break
                break;
            case 'longBreak':
                timeRemaining = LONG_BREAK_TIME;
                timerStatus.textContent = 'Long Break';
                timerDisplay.classList.remove('text-white', 'text-secondary-green');
                timerDisplay.classList.add('text-danger-red'); // Apply red for long break
                break;
        }
        updateTimerDisplay(); // Update display immediately
    };

    // Starts the Pomodoro timer countdown
    const startTimer = () => {
        if (selectedTaskId === null) {
            showCustomAlert("Please select a task from your list to start the Pomodoro timer.", 3000);
            return;
        }
        if (!timerInterval) { // Prevent starting multiple intervals
            isPaused = false;
            startTimerBtn.classList.add('hidden'); // Hide start button
            pauseTimerBtn.classList.remove('hidden'); // Show pause button

            // Set up interval to decrease time every second
            timerInterval = setInterval(() => {
                if (timeRemaining > 0) {
                    timeRemaining--;
                    updateTimerDisplay();
                } else {
                    // Timer reached 0, clear interval and handle phase completion
                    clearInterval(timerInterval);
                    timerInterval = null;
                    playNotificationSound();
                    handlePhaseCompletion();
                }
            }, 1000); // Update every 1 second
        }
    };

    // Pauses the Pomodoro timer
    const pauseTimer = () => {
        clearInterval(timerInterval); // Stop the interval
        timerInterval = null; // Clear the interval reference
        isPaused = true; // Set paused flag
        startTimerBtn.classList.remove('hidden'); // Show start button
        pauseTimerBtn.classList.add('hidden'); // Hide pause button
    };

    // Resets the Pomodoro timer to its initial 'focus' state
    const resetTimer = () => {
        pauseTimer(); // Ensure timer is stopped
        pomodoroCount = 0; // Reset Pomodoro count for the cycle
        setTimerPhase('focus'); // Go back to the initial focus phase
        startTimerBtn.classList.remove('hidden'); // Ensure start button is visible
        pauseTimerBtn.classList.add('hidden'); // Ensure pause button is hidden
        showCustomAlert('Timer reset.', 1500);
    };

    // Handles logic when a focus or break phase completes
    const handlePhaseCompletion = () => {
        if (currentPhase === 'focus') {
            pomodoroCount++; // Increment Pomodoro count
            const selectedTask = tasks.find(task => task.id === selectedTaskId);
            if (selectedTask) {
                // Increment completed Pomodoros for the selected task
                selectedTask.pomodorosCompleted++;
                saveTasks(); // Persist changes
                renderTasks(); // Update UI to reflect new count
            }

            // Determine next phase: long break or short break
            if (pomodoroCount % POMODOROS_BEFORE_LONG_BREAK === 0) {
                setTimerPhase('longBreak');
                showCustomAlert('Focus time complete! Time for a long break!', 3000);
            } else {
                setTimerPhase('shortBreak');
                showCustomAlert('Focus time complete! Time for a short break!', 2500);
            }
        } else {
            // Break phase complete, go back to focus
            setTimerPhase('focus');
            showCustomAlert('Break over! Time to focus.', 2500);
        }
        // Automatically start the next phase for continuous flow
        startTimer();
    };

    // Plays a simple notification sound using Web Audio API
    const playNotificationSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine'; // Sine wave for a smooth tone
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Volume

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.6); // Play for 0.6 seconds
    };

    // --- Event Listeners ---
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });
    taskList.addEventListener('click', handleTaskClick); // Delegated event listener for tasks
    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);

    // --- Initial Load ---
    renderTasks(); // Display any saved tasks when the page loads
    updateTimerDisplay(); // Set initial timer display (25:00)
    setTimerPhase('focus'); // Ensure correct initial status and color
});
