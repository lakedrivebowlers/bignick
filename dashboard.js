// =========================================================
// CONFIGURATION & SUPABASE CONFIG
// =========================================================
const SUPABASE_URL = 'https://nkqnkmqbzouyeuttrdcf.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcW5rbXFiem91eWV1dHRyZGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDc5NjMsImV4cCI6MjA3NzQ4Mzk2M30.6r5UB2kjz54m2T8_3HeKdrZp4LYhsW0xVp6smGlZj_M';           

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// User profiles configuration
const VALID_USERS = { 
    "admin": { id: "admin", password: "adminpass123", name: "J. Sterling", role: "Head Broker", access: "Full Root", is_admin: true },
    "agent": { id: "agent", password: "agentpass456", name: "Alex Chen", role: "PA to Eric Gallardo", access: "Limited", is_admin: false },
    "agent2": { id: "agent2", password: "pass456", name: "Alex Chen", role: "PA to Eric Gallardo", access: "Limited", is_admin: false }
};

let currentUser = null;

// =========================================================
// AUTHENTICATION & RBAC
// =========================================================
function checkAuthSession() {
    const activeUserId = localStorage.getItem('activeUserId');
    const loginScreen = document.getElementById('login-screen');
    const dashWrapper = document.getElementById('dashboard-wrapper');

    if (activeUserId && VALID_USERS[activeUserId]) {
        currentUser = VALID_USERS[activeUserId];
        
        loginScreen.classList.add('hidden');
        dashWrapper.classList.remove('hidden');
        
        document.getElementById('welcome-name').innerText = currentUser.name;
        document.getElementById('display-name').innerText = currentUser.name;
        document.getElementById('display-role').innerText = currentUser.role;
        
        const accessBadge = document.getElementById('display-access');
        accessBadge.innerText = `Access: ${currentUser.access}`;
        accessBadge.style.background = currentUser.is_admin ? '#dcfce7' : '#fee2e2';
        accessBadge.style.color = currentUser.is_admin ? '#15803d' : '#b91c1c';
        
        applyRolePermissions();
        initCharts();
        loadAllLeads();
    } else {
        loginScreen.classList.remove('hidden');
        dashWrapper.classList.add('hidden');
    }
}

function applyRolePermissions() {
    const adminElements = document.querySelectorAll('.admin-only');
    const agentWarning = document.getElementById('agent-warning');
    
    adminElements.forEach(el => {
        if (currentUser.is_admin) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    if (currentUser.is_admin) {
        agentWarning.classList.add('hidden');
    } else {
        agentWarning.classList.remove('hidden');
    }
}

document.getElementById('login-btn').addEventListener('click', () => {
    const userField = document.getElementById('username').value.trim().toLowerCase();
    const passField = document.getElementById('password').value;
    const errorDisplay = document.getElementById('login-error');
    errorDisplay.innerText = "";

    if (VALID_USERS[userField] && VALID_USERS[userField].password === passField) {
        localStorage.setItem('activeUserId', userField);
        checkAuthSession();
    } else {
        errorDisplay.innerText = "Invalid credentials. Please try again.";
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('activeUserId');
    checkAuthSession();
});

// =========================================================
// THE "GATEKEEPER" DATA SYSTEM
// =========================================================

document.getElementById('submit-lead-btn').addEventListener('click', async () => {
    const name = document.getElementById('lead-name').value;
    const zpid = document.getElementById('lead-zpid').value;
    const selectedStatus = document.getElementById('lead-status').value;
    const notes = document.getElementById('lead-notes').value;

    if (!name || !zpid) { alert("Name and ZPID are required."); return; }

    try {
        const { data, error } = await supabaseClient
            .from('leads')
            .insert([{ 
                name: name, 
                zpid: zpid, 
                notes: notes, 
                status: selectedStatus,
                author: currentUser.name,
                is_published: false 
            }]);

        if (error) {
            console.error("Supabase Error Details:", error);
            alert(`Server Error: ${error.message}`);
            return;
        }

        // Reset Form Fields
        document.getElementById('lead-name').value = '';
        document.getElementById('lead-zpid').value = '';
        document.getElementById('lead-status').value = 'pending';
        document.getElementById('lead-notes').value = '';
        
        const successMsg = document.getElementById('form-success');
        successMsg.classList.remove('hidden');
        setTimeout(() => successMsg.classList.add('hidden'), 4000);
        
        loadAllLeads(); 
    } catch (err) {
        console.error("Network Exception:", err);
        alert("Network Error: Could not connect to the database.");
    }
});

// General Portfolio Global AI Analysis Trigger
document.getElementById('analyse-ai-btn').addEventListener('click', () => {
    alert("Portfolio Analytics: AI Core structural validation processing. Enterprise environment clearance required.");
});

async function loadAllLeads() {
    try {
        // A. Public Log View (Strict Mapping to Name, Status, Notes)
        const { data: publicLeads, error: errPub } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('is_published', true)
            .order('id', { ascending: false });

        if (errPub) throw errPub;

        if (publicLeads) {
            let logHTML = '';
            publicLeads.forEach(lead => {
                const cssClass = `status-${lead.status.toLowerCase().replace(' ', '-')}`;
                logHTML += `
                    <tr>
                        <td><strong>${lead.name || 'N/A'}</strong></td>
                        <td><span class="status-tag ${cssClass}">${lead.status}</span></td>
                        <td>${lead.notes || '—'}</td>
                    </tr>`;
            });
            document.getElementById('leads-rows').innerHTML = logHTML || '<tr><td colspan="3">No records found in active sync window.</td></tr>';
        }

        // B. Admin Inbox View (Includes Author validation row layout)
        if (currentUser.is_admin) {
            const { data: inboxLeads, error: errInbox } = await supabaseClient
                .from('leads')
                .select('*')
                .eq('is_published', false)
                .order('id', { ascending: true });

            if (errInbox) throw errInbox;

            if (inboxLeads) {
                let inboxHTML = '';
                inboxLeads.forEach(lead => {
                    const cssClass = `status-${lead.status.toLowerCase().replace(' ', '-')}`;
                    inboxHTML += `
                        <tr>
                            <td><strong>${lead.author || 'Unknown'}</strong></td>
                            <td>${lead.name || 'N/A'}</td>
                            <td><span class="status-tag ${cssClass}">${lead.status}</span></td>
                            <td>${lead.notes || '—'}</td>
                            <td><button class="btn-approve" onclick="approveLead(${lead.id})">Approve</button></td>
                        </tr>
                    `;
                });
                document.getElementById('pending-rows').innerHTML = inboxHTML || '<tr><td colspan="5">Inbox configuration empty. No pending adjustments awaiting audit.</td></tr>';
            }
        }
    } catch (err) {
        console.error("Database connection fault handled:", err);
        document.getElementById('leads-rows').innerHTML = '<tr><td colspan="3" style="color: red; font-weight: bold;">Connection Exception: Data schema synchronization failed.</td></tr>';
    }
}

window.approveLead = async function(leadId) {
    const { data, error } = await supabaseClient
        .from('leads')
        .update({ is_published: true })
        .eq('id', leadId);

    if (error) {
        alert(`Approval transaction failed: ${error.message}`);
        return;
    }
    loadAllLeads(); 
};

// =========================================================
// INTERACTIVE AUTOMATED ASSISTANT (MOCK CHAT)
// =========================================================
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

function addMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;
    wrap.innerHTML = `
        <div class="avatar">${role === 'bot' ? 'AI' : 'U'}</div>
        <div class="bubble">${text}</div>
    `;
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
}

chatSend.addEventListener('click', () => {
    const promptText = chatInput.value.trim();
    if (!promptText) return;

    addMsg('user', promptText);
    chatInput.value = '';

    // Simulated helpful security fallback delay loop
    setTimeout(() => {
        const cannedReplies = [
            "I’m here to help — but it looks like I can’t respond to prompts for users without the appropriate clearance. Please request permission if needed."
        ];
        const baseReply = cannedReplies[Math.floor(Math.random() * cannedReplies.length)];
        addMsg('bot', baseReply + " Sorry.");
    }, 600);
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        chatSend.click();
    }
});

// =========================================================
// CHARTS MANAGEMENT
// =========================================================
let charts = {};
function initCharts() {
    Object.keys(charts).forEach(key => { if(charts[key]) charts[key].destroy(); });
    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

    const ctxSales = document.getElementById('salesChart').getContext('2d');
    charts.sales = new Chart(ctxSales, {
        type: 'line',
        data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ label: 'Sales Volume ($M)', data: [3.1, 2.8, 2.5, 3.7, 3.2, 2.8], borderColor: '#3b82f6', tension: 0.4, fill: true, backgroundColor: 'rgba(59, 130, 246, 0.1)' }] },
        options: chartOptions
    });

    const ctxConversion = document.getElementById('conversionChart').getContext('2d');
    charts.conversion = new Chart(ctxConversion, {
        type: 'bar',
        data: { labels: ['Showings', 'Offers', 'Escrow', 'Finalized'], datasets: [{ label: 'Pipeline Conversion', data: [45, 18, 12, 7], backgroundColor: '#10b981' }] },
        options: chartOptions
    });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: { labels: ['Commercial', 'Residential', 'Industrial'], datasets: [{ data: [45, 30, 25], backgroundColor: ['#0f172a', '#3b82f6', '#f59e0b'] }] },
        options: chartOptions
    });

    const ctxBar = document.getElementById('barChart').getContext('2d');
    charts.bar = new Chart(ctxBar, {
        type: 'bar',
        data: { labels: ['Beverly Hills', 'Bel Air', 'Malibu', 'Santa Monica'], datasets: [{ label: 'Active Listings', data: [14, 8, 11, 19], backgroundColor: '#8b5cf6' }] },
        options: chartOptions
    });
}

window.onload = checkAuthSession;