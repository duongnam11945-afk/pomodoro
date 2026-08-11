export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- API HANDLERS ---
    
    // 1. API Đăng nhập
    if (url.pathname === "/api/login" && request.method === "POST") {
      const { password } = await request.json();
      const correctPassword = env.APP_PASSWORD || "123456"; // Mật khẩu mặc định nếu chưa cài Env Var

      if (password === correctPassword) {
        return new Response(JSON.stringify({ success: true, token: correctPassword }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ success: false, message: "Sai mật khẩu!" }), { status: 401 });
    }

    // Kiểm tra Auth cho các API dữ liệu
    const authHeader = request.headers.get("Authorization");
    const isAuthenticated = authHeader === (env.APP_PASSWORD || "123456");

    // 2. API Lấy dữ liệu
    if (url.pathname === "/api/data" && request.method === "GET") {
      if (!isAuthenticated) return new Response("Unauthorized", { status: 401 });
      
      const data = await env.POMODORO_KV.get("user_data");
      return new Response(data || JSON.stringify({ timeBank: 0, historyData: [] }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. API Lưu dữ liệu
    if (url.pathname === "/api/data" && request.method === "POST") {
      if (!isAuthenticated) return new Response("Unauthorized", { status: 401 });
      
      const body = await request.text();
      await env.POMODORO_KV.put("user_data", body);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // --- RENDER HTML GIAO DIỆN ---
    return new Response(htmlContent, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};

const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pomodoro - Quỹ Thời Gian</title>
    <style>
        :root {
            --primary-color: #4CAF50;
            --danger-color: #f44336;
            --bg-color: #f9fafb;
            --box-bg: #ffffff;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg-color);
            display: flex;
            justify-content: center;
            padding: 20px;
            margin: 0;
            color: #333;
        }
        .container {
            background-color: var(--box-bg);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 450px;
            text-align: center;
        }
        h2 { margin-top: 0; color: #111; }
        #bankDisplay {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; margin-bottom: 8px; font-weight: 500; }
        input[type="text"], input[type="password"] {
            width: 90%;
            padding: 10px;
            font-size: 1rem;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-sizing: border-box;
        }
        input:disabled { background-color: #e9ecef; }
        #timerDisplay {
            font-size: 4rem;
            font-weight: bold;
            margin: 20px 0;
            font-variant-numeric: tabular-nums;
        }
        .btn-group button, .login-btn {
            padding: 10px 20px;
            font-size: 1rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            color: white;
            font-weight: bold;
            margin: 5px;
            transition: opacity 0.2s;
        }
        .btn-group button:disabled { opacity: 0.5; cursor: not-allowed; }
        #btnStart, .login-btn { background-color: var(--primary-color); }
        #btnStop { background-color: var(--danger-color); }
        
        .history-section { margin-top: 30px; text-align: left; }
        .history-section h3 { font-size: 1.1rem; margin-bottom: 10px; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        th, td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            text-align: center;
        }
        th:first-child, td:first-child { text-align: left; }
        th { background-color: #f1f3f5; font-weight: 600; }

        /* Modal Đăng nhập */
        #loginOverlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .login-box {
            background: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            width: 300px;
        }
    </style>
</head>
<body>

<!-- Form Đăng Nhập -->
<div id="loginOverlay">
    <div class="login-box">
        <h3>Đăng Nhập</h3>
        <p style="font-size: 0.85rem; color: #666;">Nhập mật khẩu để xem & lưu dữ liệu</p>
        <input type="password" id="passInput" placeholder="Mật khẩu..." onkeypress="if(event.key==='Enter') login()">
        <br><br>
        <button class="login-btn" onclick="login()">Xác nhận</button>
    </div>
</div>

<div class="container" id="mainApp" style="display: none;">
    <h2>Pomodoro - Quỹ Thời Gian</h2>
    <div id="bankDisplay">Quỹ thời gian: 00:00</div>

    <div class="input-group">
        <label for="taskEntry">Tên công việc đang làm:</label>
        <input type="text" id="taskEntry" placeholder="Nhập tên công việc...">
    </div>

    <div id="timerDisplay">24:00</div>

    <div class="btn-group">
        <button id="btnStart" onclick="startTimer()">Bắt đầu</button>
        <button id="btnStop" onclick="stopTimer()" disabled>Dừng & Cộng dồn</button>
        <button style="background: #6c757d;" onclick="logout()">Đăng xuất</button>
    </div>

    <div class="history-section">
        <h3>Lịch sử công việc:</h3>
        <table>
            <thead>
                <tr>
                    <th>Công việc</th>
                    <th>Thời gian làm</th>
                    <th>Tích luỹ</th>
                </tr>
            </thead>
            <tbody id="historyTableBody"></tbody>
        </table>
    </div>
</div>

<script>
    const BLOCK_MINUTES = 24;
    const BLOCK_SECONDS = BLOCK_MINUTES * 60;

    let isRunning = false;
    let elapsedSeconds = 0;
    let timeBank = 0;
    let timerInterval = null;
    let historyData = [];
    let authToken = localStorage.getItem('pomo_auth_token') || '';

    window.onload = () => {
        if (authToken) {
            verifyAndLoadData();
        }
    };

    async function login() {
        const pass = document.getElementById('passInput').value;
        if (!pass) return alert("Vui lòng nhập mật khẩu!");

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass })
            });
            const data = await res.json();
            
            if (data.success) {
                authToken = data.token;
                localStorage.setItem('pomo_auth_token', authToken);
                verifyAndLoadData();
            } else {
                alert(data.message || "Sai mật khẩu!");
            }
        } catch (e) {
            alert("Lỗi kết nối máy chủ!");
        }
    }

    function logout() {
        localStorage.removeItem('pomo_auth_token');
        location.reload();
    }

    async function verifyAndLoadData() {
        try {
            const res = await fetch('/api/data', {
                headers: { 'Authorization': authToken }
            });

            if (res.status === 401) {
                logout();
                return;
            }

            const data = await res.json();
            timeBank = data.timeBank || 0;
            historyData = data.historyData || [];

            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';

            updateBankDisplay();
            renderHistory();
            document.getElementById('timerDisplay').innerText = formatTime(BLOCK_SECONDS, false);
        } catch (e) {
            alert("Lỗi khi tải dữ liệu từ máy chủ!");
        }
    }

    async function saveData() {
        try {
            await fetch('/api/data', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': authToken 
                },
                body: JSON.stringify({ timeBank, historyData })
            });
        } catch (e) {
            console.error("Lỗi khi lưu dữ liệu:", e);
        }
    }

    function formatTime(seconds, showSign = true) {
        let sign = seconds < 0 ? "-" : "";
        let absSeconds = Math.abs(seconds);
        let mins = Math.floor(absSeconds / 60).toString().padStart(2, '0');
        let secs = (absSeconds % 60).toString().padStart(2, '0');
        
        if (showSign && sign === "-") return \`-\${mins}:\${secs}\`;
        return \`\${mins}:\${secs}\`;
    }

    function updateBankDisplay() {
        const bankEl = document.getElementById('bankDisplay');
        let color = timeBank >= 0 ? "green" : "red";
        let sign = timeBank > 0 ? "+" : "";
        bankEl.innerText = \`Quỹ thời gian: \${sign}\${formatTime(timeBank)}\`;
        bankEl.style.color = color;
    }

    function renderHistory() {
        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = '';
        
        historyData.forEach(item => {
            let sign = item.saved > 0 ? "+" : "";
            let tr = document.createElement('tr');
            tr.innerHTML = \`
                <td>\${item.task}</td>
                <td>\${formatTime(item.elapsed, false)}</td>
                <td>\${sign}\${formatTime(item.saved)}</td>
            \`;
            tbody.appendChild(tr);
        });
    }

    function startTimer() {
        const taskInput = document.getElementById('taskEntry');
        if (!taskInput.value.trim()) {
            alert("Vui lòng nhập tên công việc trước khi bắt đầu!");
            return;
        }

        isRunning = true;
        elapsedSeconds = 0;
        
        document.getElementById('btnStart').disabled = true;
        document.getElementById('btnStop').disabled = false;
        taskInput.disabled = true;
        document.getElementById('timerDisplay').style.color = "#333";
        
        timerInterval = setInterval(tick, 1000);
    }

    function stopTimer() {
        isRunning = false;
        clearInterval(timerInterval);
        
        let savedTime = BLOCK_SECONDS - elapsedSeconds;
        timeBank += savedTime;
        
        const taskName = document.getElementById('taskEntry').value.trim();
        historyData.unshift({ task: taskName, elapsed: elapsedSeconds, saved: savedTime });
        if (historyData.length > 20) historyData.pop(); 
        
        saveData(); // Lưu lên Cloudflare KV
        
        updateBankDisplay();
        renderHistory();
        document.getElementById('timerDisplay').innerText = formatTime(BLOCK_SECONDS, false);
        document.getElementById('timerDisplay').style.color = "#333";
        document.getElementById('btnStart').disabled = false;
        document.getElementById('btnStop').disabled = true;
        
        const taskInput = document.getElementById('taskEntry');
        taskInput.disabled = false;
        taskInput.value = '';

        let msg = savedTime >= 0 ? "hoàn thành sớm" : "lố giờ";
        setTimeout(() => {
            alert(\`Bạn đã \${msg}.\\nQuỹ thời gian thay đổi: \${formatTime(savedTime)}\`);
        }, 100);
    }

    function tick() {
        elapsedSeconds++;
        let remaining = BLOCK_SECONDS - elapsedSeconds;
        
        const timerEl = document.getElementById('timerDisplay');
        if (remaining < 0) {
            timerEl.style.color = "red";
        }
        timerEl.innerText = formatTime(remaining);
    }
</script>

</body>
</html>
`;