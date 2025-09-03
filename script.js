// DOM Element References
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const currentTaskDisplay = document.getElementById('current-task-display');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const modeButtons = document.querySelectorAll('.mode-btn');

// App State
let tasks = [];
let selectedTaskId = null;
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isPaused = true;
let notificationSound = null;

// Initialize the app
function init() {
    // Create notification sound using base64 encoded data
    notificationSound = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbVtfdJivrJBhNjVgodDbq2EcBSt8t/LQfDcPABV2s/DMeDIMABFwru3JdTAKAAxrquvHcS0IAAhmpunFbywGAAJhoefDbisFAP5dnuXBbisFAPxcnOTBbisFAPpam+TBbisFAPhZmuPBbisFAPZZmeLBbisFAPRYmOHBbisFAPJXl+DBbisFAPBWlt/BbisFAO5Vld7BbisFAOxUk93BbisFAOpTktzBbisFAOhSkdvBbisFAOZRkNrBbisFAORQj9nBbisFAOJPjtnBbisFAOBOjdnBbisEAN5Ni9jBbisEANxMidfBbisEANpLiNbBbisEANhKhtXBbisEANZJhdTBbisEANRIg9PBbisEANJHgdLBbisEAM9Gf9HBbisEAM5FftDBbisEAMxEfM/BbisEAMpDes7BbisEAMlCeM3BbisEAMdBd8zBbisDAMVAdcvBbisDAMM/dMrBbisDAMFAc8nBbisDAL8/csnBbisDAL0+cMjBbisDALs9b8fBbisDALk8bsbBbisDALc7bcXBbisDALY6bMTBbisDALQ5a8PBbisDALI4asLBbisDALA3acHBbisDAK42aMDBbisDAKw1Z7/BbisDAKo0Zr7BbisDAKgzZb3BbisDAKYyZLzBbisDAKQxY7vBbisDAKIwYrrBbisDAKAvYbnBbisDAJ4uYLjBbisDAJwtX7fBbisDAJosXrbBbisDAJgrXbXBbisDAJYqXLTBbisDAJQpW7PBbisDAJIoWrLBbisDAJAnWbHBbisDAI4mV7DBbisDAI0lVq/BbisDAIskVa7BbisDAIkjVK3BbisDAIciU6zBbisDAIUhUqvBbisDAIMgUarBbisDAIEfUKnBbisDAH8eT6jBbisDAH0dTqfBbisDAHscTabBbisDAHkbTKXBbisDAHcaS6TBbisDAHUZSqPBbisDAHMYSSL");
    
    loadTasks();
    renderTasks();
    updateTimerDisplay();
    updateButtonStates();
    setupEventListeners();
}

// Load tasks from chrome.storage
function loadTasks() {
    chrome.storage.local.get(['synergy-tasks'], function(result) {
        if (result['synergy-tasks']) {
            tasks = JSON.parse(result['synergy-tasks']);
            renderTasks();
        }
    });
}

// Save tasks to chrome.storage
function saveTasks() {
    chrome.storage.local.set({'synergy-tasks': JSON.stringify(tasks)});
}

// === Task Management Functions ===
function renderTasks() {
    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-clipboard-list"></i>
            <p>No tasks yet. Add one to get started!</p>
        `;
        taskList.appendChild(emptyState);
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.setAttribute('data-id', task.id);
        li.className = task.completed ? 'completed' : '';
        if (task.id === selectedTaskId) {
            li.classList.add('selected');
        }

        li.innerHTML = `
            <span class="task-text">${task.text}</span>
            <span class="pomodoro-count">${task.pomodoros} <i class="fas fa-clock"></i></span>
            <div class="task-actions">
                <button class="complete-btn" title="Complete">
                    <i class="fas fa-check"></i>
                </button>
                <button class="delete-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        li.querySelector('.complete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskComplete(task.id);
        });

        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        li.addEventListener('click', () => {
            selectTask(task.id);
        });
        
        taskList.appendChild(li);
    });
}

function addTask() {
    const text = taskInput.value.trim();
    if (text) {
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            pomodoros: 0
        };
        tasks.push(newTask);
        taskInput.value = '';
        saveTasks();
        renderTasks();
        // Auto-select the new task if none is selected
        if (!selectedTaskId) {
            selectTask(newTask.id);
        }
    }
}

function toggleTaskComplete(id) {
    tasks = tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    if (selectedTaskId === id) {
        selectedTaskId = null;
        currentTaskDisplay.textContent = 'Select a task to begin';
        resetTimer();
    }
    renderTasks();
}

function selectTask(id) {
    selectedTaskId = id;
    const selectedTask = tasks.find(task => task.id === selectedTaskId);
    currentTaskDisplay.textContent = `Focusing on: ${selectedTask.text}`;
    renderTasks();
}

function updateButtonStates() {
    // Disable start button when timer is running
    startBtn.disabled = !isPaused;
    
    // Disable pause button when timer is not running
    pauseBtn.disabled = isPaused;
    
    // Add/remove active class based on state
    if (!isPaused) {
        startBtn.classList.remove('active');
        pauseBtn.classList.add('active');
    } else {
        startBtn.classList.add('active');
        pauseBtn.classList.remove('active');
    }
}

function startTimer() {
    if (!selectedTaskId) {
        alert('Please select a task to focus on first!');
        return;
    }
    if (isPaused) {
        isPaused = false;
        updateButtonStates();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (notificationSound) {
                    notificationSound.play();
                }
                showCompletionNotification();
                incrementPomodoro();
                resetTimer();
                updateButtonStates();
            }
        }, 1000);
    }
}

function pauseTimer() {
    isPaused = true;
    clearInterval(timerInterval);
    updateButtonStates();
}

function resetTimer() {
    pauseTimer();
    timeLeft = 25 * 60;
    updateTimerDisplay();
    updateButtonStates();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Visual feedback when time is running low
    if (timeLeft <= 60) {
        timerDisplay.style.color = 'var(--error)';
    } else {
        timerDisplay.style.color = 'var(--primary)';
    }
}

function incrementPomodoro() {
    if (selectedTaskId) {
        tasks = tasks.map(task =>
            task.id === selectedTaskId ? { ...task, pomodoros: task.pomodoros + 1 } : task
        );
        saveTasks();
        renderTasks();
    }
}

function showCompletionNotification() {
    // Create browser notification
    chrome.notifications.create('pomodoroComplete', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Pomodoro Complete!',
        message: 'Time for a break.',
        priority: 2
    });
    
    // Also show in-app notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <p>Pomodoro complete! Time for a break.</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function setTimerMode(minutes) {
    timeLeft = minutes;
    resetTimer();
    updateTimerDisplay();
}

// === Event Listeners ===
function setupEventListeners() {
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            setTimerMode(parseInt(button.dataset.time));
        });
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);