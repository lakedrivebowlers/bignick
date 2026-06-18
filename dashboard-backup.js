// =========================================================
// CONFIGURATION & SUPABASE CONFIG
// =========================================================
const SUPABASE_URL = 'https://nkqnkmqbzouyeuttrdcf.supabase.co'; // Replace
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcW5rbXFiem91eWV1dHRyZGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDc5NjMsImV4cCI6MjA3NzQ4Mzk2M30.6r5UB2kjz54m2T8_3HeKdrZp4LYhsW0xVp6smGlZj_M';           // Replace

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mocking exact user configurations based on your screenshots
const VALID_USERS = { 
    "admin": { id: "admin", name: "J. Sterling", role: "Head Broker", access: "Full Root", is_admin: true },
    "agent": { id: "agent", name: "Joe Cole", role: "PA to J. Sterling", access: "Limited", is_admin: false }
};
const MASTER_PASSWORD = "password123";

let currentUser = null;

// =========================================================
// AUTHENTICATION & RBAC
// =========================================================
function checkAuthSession() {
    const activeUserId = localStorage.getItem('activeUserId');
    const loginScreen = document.getElementById('login-screen');
    const dashScreen = document.getElementById('dashboard-screen');
    const aiWidget = document.getElementById('ai-widget');

    if (activeUserId && VALID_USERS[activeUserId]) {
        currentUser = VALID_USERS[activeUserId];
        
        loginScreen.classList.add('hidden');
        dashScreen.classList.remove('hidden');
        aiWidget.classList.remove('hidden');
        
        // Update the vibrant header text
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
        dashScreen.classList.add('hidden');
        aiWidget.classList.add('hidden');
    }
}

function applyRolePermissions() {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        if (currentUser.is_admin) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

document.getElementById('login-btn').addEventListener('click', () => {
    const userField = document.getElementById('username').value.trim().toLowerCase();
    const passField = document.getElementById('password').value;
    const errorDisplay = document.getElementById('login-error');
    errorDisplay.innerText = "";

    if (VALID_USERS[userField] && passField === MASTER_PASSWORD) {
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

// 1. Form Submission -> Goes straight to the invisible 'Inbox'
document.getElementById('submit-lead-btn').addEventListener('click', async () => {
    const name = document.getElementById('lead-name').value;
    const zpid = document.getElementById('lead-zpid').value;
    const selectedStatus = document.getElementById('lead-status').value;
    const notes = document.getElementById('lead-notes').value;

    if (!name || !zpid) { alert("Name and ZPID are required."); return; }

    // Save with author name, and default visibility to FALSE
    const { data, error } = await supabaseClient
        .from('leads')
        .insert([
            { 
                name: name, 
                zpid: zpid, 
                notes: notes, 
                status: selectedStatus,
                author: currentUser.name,
                is_published: false 
            }
        ]);

    if (error) {
        alert(`Server Error: ${error.message}`);
        return;
    }

    // Reset Form
    document.getElementById('lead-name').value = '';
    document.getElementById('lead-zpid').value = '';
    document.getElementById('lead-status').value = 'Pending';
    document.getElementById('lead-notes').value = '';
    
    const successMsg = document.getElementById('form-success');
    successMsg.classList.remove('hidden');
    setTimeout(() => successMsg.classList.add('hidden'), 4000);
    
    loadAllLeads(); 
});

// 2. Load the Data
async function loadAllLeads() {
    
    // A. The Public Client Manifest (Fetches ONLY is_published = true)
    // Notice it ignores the property "status" entirely. If it's published, it shows it.
    const { data: publicLeads, error: errPub } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('is_published', true)
        .order('id', { ascending: false });

    if (!errPub && publicLeads) {
        let manifestHTML = '';
        publicLeads.forEach(lead => {
            const date = lead.created_at ? lead.created_at.split('T')[0] : 'N/A';
            const cssClass = `status-${lead.status.toLowerCase()}`;
            manifestHTML += `
                <tr>
                    <td>${date}</td>
                    <td><strong>${lead.author}</strong></td>
                    <td>${lead.name}</td>
                    <td><span class="status-tag ${cssClass}">${lead.status}</span></td>
                </tr>`;
        });
        document.getElementById('leads-rows').innerHTML = manifestHTML || '<tr><td colspan="4">No data in manifest.</td></tr>';
    }

    // B. Admin Inbox (Fetches ONLY is_published = false)
    if (currentUser.is_admin) {
        const { data: inboxLeads, error: errInbox } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('is_published', false)
            .order('id', { ascending: true });

        if (!errInbox && inboxLeads) {
            let inboxHTML = '';
            inboxLeads.forEach(lead => {
                const cssClass = `status-${lead.status.toLowerCase()}`;
                inboxHTML += `
                    <tr>
                        <td><strong>${lead.author}</strong></td>
                        <td>${lead.name}</td>
                        <td><code>${lead.zpid}</code></td>
                        <td><span class="status-tag ${cssClass}">${lead.status}</span></td>
                        <td><button class="btn-approve" onclick="approveLead(${lead.id})">Approve</button></td>
                    </tr>
                `;
            });
            document.getElementById('pending-rows').innerHTML = inboxHTML || '<tr><td colspan="5">Inbox is empty.</td></tr>';
        }
    }
}

// 3. Admin Click -> Flips the Boolean Gate
window.approveLead = async function(leadId) {
    const { data, error } = await supabaseClient
        .from('leads')
        .update({ is_published: true })
        .eq('id', leadId);

    if (error) {
        alert(`Approval failed: ${error.message}`);
        return;
    }

    loadAllLeads(); 
};

// =========================================================
// CHARTS (Visual Filler)
// =========================================================
let charts = {};
function initCharts() {
    Object.keys(charts).forEach(key => { if(charts[key]) charts[key].destroy(); });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Commercial', 'Residential', 'Industrial'],
            datasets: [{ data: [45, 30, 25], backgroundColor: ['#4f46e5', '#10b981', '#f59e0b'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });

    const ctxSales = document.getElementById('salesChart').getContext('2d');
    charts.sales = new Chart(ctxSales, {
        type: 'bar',
        data: {
            labels: ['Q1', 'Q2', 'Q3'],
            datasets: [{ label: 'Revenue', data: [12, 19, 15], backgroundColor: '#4f46e5', borderRadius: 4 }]
        }
    });
}

window.onload = checkAuthSession;