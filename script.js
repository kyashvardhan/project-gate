// --- FIREBASE SETUP ---
// Note: This assumes the Firebase SDKs are imported in index.html
// We are making them available globally from that script.
const db = window.db;
const { doc, setDoc, getDoc, collection, getDocs, addDoc, deleteDoc, onSnapshot } = window;

// --- GLOBAL STATE ---
let progressData = {};
let knowledgeHubData = [];
let mistakeData = [];
let pyqCount = 0;
let reportChart;
let currentView = 'planner';

// --- DATA STRUCTURES ---
const gatePlan = [
    // ... (Same gatePlan data as before)
    {
        subject: "Discrete Mathematics",
        duration: 14,
        startDate: "2025-07-25",
        endDate: "2025-08-07",
        tasks: [
            { week: 1, day: "Day 1-2", topic: "Mathematical Logic: Propositional Logic" },
            { week: 1, day: "Day 3-5", topic: "Mathematical Logic: First-Order Logic & Inference" },
            { week: 2, day: "Day 6-7", topic: "Set Theory & Functions Fundamentals" },
            { week: 2, day: "Day 8-9", topic: "Combinatorics: Counting Principles, Pigeonhole" },
            { week: 2, day: "Day 10-11", topic: "Graph Theory: Basics, Traversals, Connectivity" },
            { week: 3, day: "Day 12", topic: "Group Theory Basics" },
            { week: 3, day: "Day 13-14", topic: "Full Subject PYQ Marathon & Revision" },
        ]
    },
    {
        subject: "Digital Logic",
        duration: 8,
        startDate: "2025-08-08",
        endDate: "2025-08-15",
        tasks: [
            { week: 3, day: "Day 1-2", topic: "Boolean Algebra & K-Maps" },
            { week: 3, day: "Day 3-4", topic: "Combinational Circuits (Adders, Mux)" },
            { week: 4, day: "Day 5-6", topic: "Sequential Circuits (Latches, Flip-Flops)" },
            { week: 4, day: "Day 7-8", topic: "FSM, Counters, and Registers" },
        ]
    },
    // ... Add all other subjects from the original plan here
];


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', init);

function init() {
    loadAllData();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    feather.replace();
}

// --- DATA HANDLING (DATABASE) ---
async function loadAllData() {
    if (!db) {
        setTimeout(loadAllData, 100);
        return;
    }
    await loadProgress();
    await loadKnowledgeHub();
    await loadStrategyData(); // for mistakes and pyq
    
    // Initial Render
    renderAll();
}

async function loadProgress() {
    const docRef = doc(db, "progress", "userData");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        progressData = docSnap.data();
    } else {
        gatePlan.forEach((_, sIndex) => {
            progressData[sIndex] = gatePlan[sIndex].tasks.map(() => false);
        });
    }
}

async function loadKnowledgeHub() {
    const querySnapshot = await getDocs(collection(db, "knowledgeHub"));
    knowledgeHubData = [];
    querySnapshot.forEach((doc) => {
        knowledgeHubData.push({ id: doc.id, ...doc.data() });
    });
}

async function loadStrategyData() {
    const docRef = doc(db, "strategy", "userData");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        mistakeData = data.mistakes || [];
        pyqCount = data.pyqCount || 0;
    }
}

async function saveData(collectionName, docName, data) {
    if (!db) return;
    try {
        await setDoc(doc(db, collectionName, docName), data);
        console.log(`${docName} in ${collectionName} saved!`);
    } catch (e) {
        console.error("Error saving data: ", e);
    }
}

// --- RENDERING ---
function renderAll() {
    renderSubjects();
    renderKnowledgeHub();
    renderStrategyRoom();
    renderAnalytics();
    updateCurrentFocus();
}

function renderSubjects() {
    const container = document.getElementById('subjects-container');
    if (!container) return;
    container.innerHTML = '';
    gatePlan.forEach((subject, sIndex) => {
        const completedTasks = progressData[sIndex] ? progressData[sIndex].filter(Boolean).length : 0;
        const totalTasks = subject.tasks.length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const subjectCardHTML = `
            <div class="card rounded-2xl p-4 sm:p-6">
                <details>
                    <summary class="flex justify-between items-center cursor-pointer">
                        <div class="flex-grow">
                            <h3 class="text-lg font-bold">${subject.subject}</h3>
                            <p class="text-xs text-gray-400">${subject.startDate} to ${subject.endDate}</p>
                            <div class="mt-2">
                                <div class="progress-bar-bg w-full rounded-full h-2.5">
                                    <div id="progress-${sIndex}" class="progress-bar-fill h-2.5 rounded-full" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="ml-4 text-right">
                            <span class="text-xl font-bold">${percentage}%</span>
                            <span class="block text-xs text-gray-400">${completedTasks}/${totalTasks} tasks</span>
                        </div>
                    </summary>
                    <div class="mt-4 border-t border-gray-700 pt-4">
                        <!-- AI and other buttons here -->
                    </div>
                </details>
            </div>
        `;
        container.innerHTML += subjectCardHTML;
    });
}

function renderKnowledgeHub() {
    const container = document.getElementById('knowledge-hub-container');
    if (!container) return;
    container.innerHTML = '';
    knowledgeHubData.forEach(subject => {
        const subjectCard = `
            <div class="card rounded-2xl p-6 cursor-pointer hover:border-purple-500 transition-all" onclick="openSubjectNotes('${subject.id}')">
                <h3 class="text-xl font-bold">${subject.name}</h3>
                <p class="text-sm text-gray-400 mt-2">${subject.topics ? subject.topics.length : 0} notes</p>
            </div>
        `;
        container.innerHTML += subjectCard;
    });
}

function renderStrategyRoom() {
    // Render PYQ Counter
    const pyqEl = document.getElementById('pyq-count');
    if(pyqEl) pyqEl.innerText = pyqCount;

    // Render Mistake List
    const mistakeListEl = document.getElementById('mistake-list');
    if(!mistakeListEl) return;
    mistakeListEl.innerHTML = '';
    mistakeData.slice().reverse().forEach((mistake, index) => {
        const mistakeItem = `
            <div class="p-3 bg-gray-800 rounded-lg">
                <p class="font-bold text-sm">${mistake.subject} - <span class="font-normal">${mistake.topic}</span></p>
                <p class="text-xs text-gray-400 mt-1">${mistake.note}</p>
            </div>
        `;
        mistakeListEl.innerHTML += mistakeItem;
    });
}

function renderAnalytics() {
    updateOverallProgress();
    renderReportChart();
}

function renderReportChart() {
    const ctx = document.getElementById('reportChart');
    if (!ctx) return;
    if (reportChart) {
        reportChart.destroy();
    }
    const labels = gatePlan.map(s => s.subject);
    const data = gatePlan.map((_, sIndex) => progressData[sIndex] ? progressData[sIndex].filter(Boolean).length : 0);

    reportChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data, backgroundColor: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f472b6', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'], borderColor: '#1a1a1a', borderWidth: 2 }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', boxWidth: 12, padding: 15 } } }
        }
    });
}

// --- UI & EVENT HANDLERS ---
window.switchView = (viewName) => {
    currentView = viewName;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="switchView('${viewName}')"]`).classList.add('active');
    
    feather.replace(); // Re-render icons for the new view
    if(viewName === 'analytics') renderReportChart(); // Ensure chart is rendered when switching
}

window.updateProgress = (sIndex, tIndex) => {
    progressData[sIndex][tIndex] = !progressData[sIndex][tIndex];
    saveData("progress", "userData", progressData);
    renderSubjects(); // Re-render to update percentages
    updateOverallProgress();
    if(currentView === 'analytics') renderReportChart();
}

window.showAddSubjectModal = async () => {
    const subjectName = prompt("Enter the name of the new subject:");
    if (subjectName && subjectName.trim() !== "") {
        const newSubject = { name: subjectName, topics: [] };
        await addDoc(collection(db, "knowledgeHub"), newSubject);
        loadKnowledgeHub().then(renderKnowledgeHub); // Reload and render
    }
}

window.addMistake = () => {
    const subject = document.getElementById('mistake-subject').value;
    const topic = document.getElementById('mistake-topic').value;
    const note = document.getElementById('mistake-note').value;
    if(!subject || !topic || !note) {
        alert("Please fill all fields for the mistake.");
        return;
    }
    mistakeData.push({ subject, topic, note, date: new Date().toISOString() });
    saveData("strategy", "userData", { pyqCount, mistakes: mistakeData });
    renderStrategyRoom();
    // Clear inputs
    document.getElementById('mistake-subject').value = '';
    document.getElementById('mistake-topic').value = '';
    document.getElementById('mistake-note').value = '';
}

window.updatePyqCount = (amount) => {
    pyqCount += amount;
    if (pyqCount < 0) pyqCount = 0;
    saveData("strategy", "userData", { pyqCount, mistakes: mistakeData });
    renderStrategyRoom();
}


// --- UTILITY FUNCTIONS ---
function updateOverallProgress() {
    let totalCompleted = 0;
    let totalTasks = 0;
    gatePlan.forEach((_, sIndex) => {
        if (progressData[sIndex]) {
            totalCompleted += progressData[sIndex].filter(Boolean).length;
        }
        totalTasks += gatePlan[sIndex].tasks.length;
    });
    
    const overallPercentage = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    const circle = document.getElementById('overall-progress-circle');
    const text = document.getElementById('overall-progress-text');
    if(circle) circle.style.strokeDasharray = `${overallPercentage}, 100`;
    if(text) text.textContent = `${overallPercentage}%`;

    const totalCompletedEl = document.getElementById('total-tasks-completed');
    const totalTasksEl = document.getElementById('total-tasks');
    if(totalCompletedEl) totalCompletedEl.textContent = totalCompleted;
    if(totalTasksEl) totalTasksEl.textContent = totalTasks;
}

function updateCountdown() {
    const countDownDate = new Date("Nov 30, 2025 23:59:59").getTime();
    const now = new Date().getTime();
    const distance = countDownDate - now;
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    document.getElementById("days").innerText = String(days).padStart(2, '0');
    document.getElementById("hours").innerText = String(hours).padStart(2, '0');
    document.getElementById("minutes").innerText = String(minutes).padStart(2, '0');
    document.getElementById("seconds").innerText = String(seconds).padStart(2, '0');
}

function updateCurrentFocus() {
    const today = new Date();
    today.setHours(0,0,0,0); 
    let currentSubject = "Plan Complete!";
    for (const subject of gatePlan) {
        const startDate = new Date(subject.startDate);
        const endDate = new Date(subject.endDate);
        if (today >= startDate && today <= endDate) {
            currentSubject = subject.subject;
            break;
        }
    }
     if (currentSubject === "Plan Complete!" && today < new Date(gatePlan[0].startDate)) {
        currentSubject = "Prep starts soon!";
    }
    const focusEl = document.getElementById('current-focus');
    if(focusEl) focusEl.textContent = currentSubject;
}

// --- MODAL & AI LOGIC ---
const modalBackdrop = document.getElementById('modal-backdrop');
const modalContent = document.getElementById('modal-content');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

window.showModal = () => {
    modalBackdrop.classList.add('show');
    modalContent.classList.add('show');
}
window.closeModal = () => {
    modalBackdrop.classList.remove('show');
    modalContent.classList.remove('show');
}
modalBackdrop.addEventListener('click', closeModal);
