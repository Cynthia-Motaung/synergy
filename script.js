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
    let pomodoroCount = 0;
    const FOCUS_TIME = 25 * 60; // 25 minutes
    const SHORT_BREAK_TIME = 5 * 60; // 5 minutes
    const LONG_BREAK_TIME = 15 * 60; // 15 minutes
    const POMODOROS_BEFORE_LONG_BREAK = 4;

    // --- Task Variables ---
    let tasks = JSON.parse(localStorage.getItem('productivityHubTasks')) || [];
    let selectedTaskId = null;

    // --- Functions ---

    // Saves tasks to local storage
    const saveTasks = () => {
        localStorage.setItem('productivityHubTasks', JSON.stringify(tasks));
    };

    // Renders the task list
    const renderTasks = () => {
        taskList.innerHTML = ''; // Clear existing tasks
        if (tasks.length === 0) {
            taskList.innerHTML = '<li class="text-gray-500 text-center py-4">No tasks yet! Add one above.</li>';
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `flex items-center justify-between p-3 rounded-md shadow-sm transition duration-200 ease-in-out ${task.completed ? 'bg-green-100 text-gray-500 line-through' : 'bg-gray-50 hover:bg-gray-100'} ${task.id === selectedTaskId ? 'border-2 border-blue-500' : ''}`;
            li.dataset.id = task.id;

            li.innerHTML = `
                <div class="flex items-center flex-grow">
                    <input type="checkbox" class="task-checkbox mr-3 h-5 w-5 text-green-600 rounded focus:ring-green-500" ${task.completed ? 'checked' : ''}>
                    <span class="task-text flex-grow cursor-pointer">${task.text}</span>
                    <span class="ml-2 text-sm text-gray-500">${task.pomodorosCompleted} Pomodoros</span>
                </div>
                <div class="flex items-center ml-4">
                    <button class="select-task-btn bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-300 ease-in-out text-sm mr-2">
                        <i class="fas fa-play-circle"></i> Use
                    </button>
                    <button class="delete-task-btn text-red-500 hover:text-red-700 transition duration-300 ease-in-out">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            taskList.appendChild(li);
        });
        updateCurrentTaskInfo();
    };

    // Adds a new task
    const addTask = () => {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const newTask = {
                id: Date.now().toString(),
                text: taskText,
                completed: false,
                pomodorosCompleted: 0
            };
            tasks.push(newTask);
            newTaskInput.value = '';
            saveTasks();
            renderTasks();
        }
    };

    // Handles task list clicks (checkbox, delete, select)
    const handleTaskClick = (event) => {
        const target = event.target;
        const listItem = target.closest('li');
        if (!listItem) return;

        const taskId = listItem.dataset.id;
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (target.classList.contains('task-checkbox')) {
            // Toggle task completion
            tasks[taskIndex].completed = target.checked;
            saveTasks();
            renderTasks();
        } else if (target.closest('.delete-task-btn')) {
            // Delete task
            tasks.splice(taskIndex, 1);
            if (selectedTaskId === taskId) {
                selectedTaskId = null; // Deselect if deleted
                resetTimer(); // Reset timer if current task is deleted
            }
            saveTasks();
            renderTasks();
        } else if (target.closest('.select-task-btn') || target.classList.contains('task-text')) {
            // Select task for Pomodoro
            if (selectedTaskId === taskId) {
                // If already selected, deselect it
                selectedTaskId = null;
                resetTimer();
            } else {
                selectedTaskId = taskId;
                // If timer is running and a new task is selected, reset and start with new task
                if (!isPaused) {
                    resetTimer();
                    startTimer();
                } else {
                    // If paused, just update info and prepare timer for the selected task
                    setTimerPhase('focus'); // Ensure it starts as focus time
                }
            }
            renderTasks(); // Re-render to highlight selected task
        }
    };

    // Updates the current task info display below the timer
    const updateCurrentTaskInfo = () => {
        if (selectedTaskId) {
            const selectedTask = tasks.find(task => task.id === selectedTaskId);
            if (selectedTask) {
                currentTaskInfo.textContent = `Focusing on: "${selectedTask.text}"`;
            } else {
                currentTaskInfo.textContent = 'No task selected for Pomodoro. Select a task from above.';
            }
        } else {
            currentTaskInfo.textContent = 'No task selected for Pomodoro. Select a task from above.';
        }
    };

    // Formats time for display
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Updates the timer display
    const updateTimerDisplay = () => {
        timerDisplay.textContent = formatTime(timeRemaining);
    };

    // Sets the timer phase (focus, short break, long break)
    const setTimerPhase = (phase) => {
        currentPhase = phase;
        switch (phase) {
            case 'focus':
                timeRemaining = FOCUS_TIME;
                timerStatus.textContent = 'Focus Time';
                timerDisplay.classList.remove('text-green-800', 'text-red-800');
                timerDisplay.classList.add('text-blue-800');
                break;
            case 'shortBreak':
                timeRemaining = SHORT_BREAK_TIME;
                timerStatus.textContent = 'Short Break';
                timerDisplay.classList.remove('text-blue-800', 'text-red-800');
                timerDisplay.classList.add('text-green-800');
                break;
            case 'longBreak':
                timeRemaining = LONG_BREAK_TIME;
                timerStatus.textContent = 'Long Break';
                timerDisplay.classList.remove('text-blue-800', 'text-green-800');
                timerDisplay.classList.add('text-red-800');
                break;
        }
        updateTimerDisplay();
    };

    // Starts the timer
    const startTimer = () => {
        if (selectedTaskId === null) {
            alert("Please select a task from your list to start the Pomodoro timer.");
            return;
        }
        if (!timerInterval) {
            isPaused = false;
            startTimerBtn.classList.add('hidden');
            pauseTimerBtn.classList.remove('hidden');

            timerInterval = setInterval(() => {
                if (timeRemaining > 0) {
                    timeRemaining--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    playNotificationSound();
                    handlePhaseCompletion();
                }
            }, 1000);
        }
    };

    // Pauses the timer
    const pauseTimer = () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
        startTimerBtn.classList.remove('hidden');
        pauseTimerBtn.classList.add('hidden');
    };

    // Resets the timer
    const resetTimer = () => {
        pauseTimer();
        pomodoroCount = 0; // Reset Pomodoro count on full reset
        setTimerPhase('focus');
        startTimerBtn.classList.remove('hidden');
        pauseTimerBtn.classList.add('hidden');
    };

    // Handles the completion of a focus or break phase
    const handlePhaseCompletion = () => {
        if (currentPhase === 'focus') {
            pomodoroCount++;
            const selectedTask = tasks.find(task => task.id === selectedTaskId);
            if (selectedTask) {
                selectedTask.pomodorosCompleted++;
                saveTasks();
                renderTasks(); // Update task list to show new pomodoro count
            }

            if (pomodoroCount % POMODOROS_BEFORE_LONG_BREAK === 0) {
                setTimerPhase('longBreak');
            } else {
                setTimerPhase('shortBreak');
            }
            alert(`Time for a ${currentPhase === 'longBreak' ? 'long' : 'short'} break!`);
        } else {
            setTimerPhase('focus');
            alert('Break over! Time to focus.');
        }
        // Automatically start the next phase for continuous flow
        startTimer();
    };

    // Plays a simple notification sound (using Web Audio API for no external files)
    const playNotificationSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        // Stop the sound after a short duration
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    // --- Event Listeners ---
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });
    taskList.addEventListener('click', handleTaskClick);
    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);

    // --- Initial Load ---
    renderTasks(); // Display any saved tasks
    updateTimerDisplay(); // Set initial timer display
});