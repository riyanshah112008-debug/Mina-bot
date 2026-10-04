// 你的 Discord Bot ID
const BOT_CLIENT_ID = '1513589513648345368';
const API_BASE_URL = 'http://localhost:5000/api';

// 生成邀请机器人链接
const getInviteUrl = (guildId) => {
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    return `https://discord.com/api/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}&redirect_uri=${redirectUri}&response_type=code`;
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. 安全检查
    const token = localStorage.getItem('starryboard_token');
    const savedUserStr = localStorage.getItem('starryboard_user');

    if (!token || !savedUserStr) {
        alert('Please log in to Discord first!');
        window.location.href = './index.html';
        return;
    }

    // 2. 清理 URL query 参数
    if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 3. 渲染用户信息
    try {
        const user = JSON.parse(savedUserStr);
        document.getElementById('userName').innerText = user.global_name || user.username;
        document.getElementById('userAvatar').src = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        document.getElementById('userProfile').style.display = 'flex';
    } catch (e) {
        console.error("解析用户信息失败", e);
    }

    // 4. 刷新服务器数据并渲染
    refreshServerData();

    // 5. 启动倒计时器
    startCountdownTimers();

    // 6. 切回页面时自动检测并更新
    window.addEventListener('focus', () => {
        refreshServerData();
    });
});

/**
 * 刷新服务器数据（网络优先 -> 本地缓存降级）
 */
async function refreshServerData() {
    const token = localStorage.getItem('starryboard_token');

    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/user/guilds`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const latestGuilds = await response.json();
                localStorage.setItem('starryboard_guilds', JSON.stringify(latestGuilds));
            }
        } catch (err) {
            console.warn("拉取最新服务器状态失败，降级使用本地缓存:", err);
        }
    }

    renderServerGrid();
}

/**
 * 渲染服务器网格（支持 Bump 排序）
 */
function renderServerGrid() {
    const serverGrid = document.getElementById('serverGrid');
    const savedGuilds = localStorage.getItem('starryboard_guilds');
    let guilds = [];

    try {
        guilds = savedGuilds ? JSON.parse(savedGuilds) : [];
    } catch (e) {
        console.error("解析服务器列表失败", e);
    }

    const manageableGuilds = guilds.filter(g => g.can_manage);

    if (manageableGuilds.length === 0) {
        serverGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: var(--card-bg); border-radius: 16px; border: 1px solid var(--card-border);">
                <i class="fa-solid fa-server" style="font-size: 32px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <p style="color: var(--text-muted); font-size: 16px;">No Discord servers found where you have management or invite permissions.</p>
            </div>`;
        return;
    }

    // 🔥【核心：Bump 实时排序逻辑】
    // 计算每个 Guild 的实际 Bump 时间并做降序排列（刚刚 Bump 过的排在最前面）
    manageableGuilds.sort((a, b) => {
        const timeA = a.next_bump_time || parseInt(localStorage.getItem(`next_bump_${a.id}`)) || 0;
        const timeB = b.next_bump_time || parseInt(localStorage.getItem(`next_bump_${b.id}`)) || 0;
        return timeB - timeA; // 降序：时间戳大的在前面
    });

    serverGrid.innerHTML = manageableGuilds.map(guild => {
        const iconUrl = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const hasBotInstalled = guild.has_bot !== undefined ? guild.has_bot : false;

        // 优先获取后端返回的 next_bump_time，网络不可用时读取本地 localStorage
        let nextBumpTime = guild.next_bump_time || 0;
        if (!nextBumpTime) {
            const savedBumpTime = localStorage.getItem(`next_bump_${guild.id}`);
            nextBumpTime = savedBumpTime ? parseInt(savedBumpTime) : Date.now();
        }

        return createServerCardHtml(guild, iconUrl, hasBotInstalled, nextBumpTime);
    }).join('');
}

/**
 * 生成单个服务器卡片 HTML
 */
function createServerCardHtml(guild, iconUrl, hasBotInstalled, nextBumpTime) {
    const isReadyToBump = Date.now() >= nextBumpTime;

    return `
        <div class="server-card" data-guild-id="${guild.id}">
            <div>
                <div class="card-header">
                    <img class="server-icon" src="${iconUrl}" alt="${guild.name}">
                    <div class="server-info">
                        <div class="server-name" title="${guild.name}">${guild.name}</div>
                        <div class="server-status-tag">
                            <span class="status-dot ${hasBotInstalled ? 'installed' : 'uninstalled'}"></span>
                            ${hasBotInstalled ? 'Bot Active' : 'Bot Not Added'}
                        </div>
                    </div>
                </div>

                ${hasBotInstalled ? `
                    <div class="bump-status-box">
                        <div class="bump-label">
                            <i class="fa-solid fa-rocket"></i> Next Bump
                        </div>
                        <div class="bump-time ${isReadyToBump ? 'ready' : 'cooldown'}"
                             data-timestamp="${nextBumpTime}">
                            ${isReadyToBump ? '✨ Ready' : 'Calculating...'}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="card-actions">
                ${hasBotInstalled ? `
                    <button class="btn btn-secondary" title="View Server Page & Invite" onclick="viewServerPage('${guild.id}')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary" title="Edit Server Listing Info" onclick="editServerPage('${guild.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn btn-primary" id="bump-btn-${guild.id}" ${!isReadyToBump ? 'disabled' : ''} onclick="triggerBump('${guild.id}')">
                        <i class="fa-solid fa-bolt"></i> ${isReadyToBump ? 'Bump' : 'Cooldown'}
                    </button>
                ` : `
                    <a class="btn btn-primary" style="width: 100%;" href="${getInviteUrl(guild.id)}" target="_blank" onclick="markBotAdding('${guild.id}')">
                        <i class="fa-solid fa-plus"></i> Add Bot to Server
                    </a>
                `}
            </div>
        </div>
    `;
}

function viewServerPage(guildId) {
    window.location.href = `./server.html?id=${guildId}`;
}

function editServerPage(guildId) {
    window.location.href = `./edit.html?id=${guildId}`;
}

function markBotAdding(guildId) {
    const savedGuilds = localStorage.getItem('starryboard_guilds');
    if (savedGuilds) {
        try {
            let guilds = JSON.parse(savedGuilds);
            guilds = guilds.map(g => {
                if (g.id === guildId) g.has_bot = true;
                return g;
            });
            localStorage.setItem('starryboard_guilds', JSON.stringify(guilds));
        } catch (e) {
            console.error("更新本地缓存失败", e);
        }
    }
}

/**
 * 实时 Bump 倒计时逻辑
 */
function startCountdownTimers() {
    function update() {
        document.querySelectorAll('.bump-time[data-timestamp]').forEach(el => {
            const targetTime = parseInt(el.getAttribute('data-timestamp'));
            const now = Date.now();
            const diff = targetTime - now;

            const card = el.closest('.server-card');
            const guildId = card ? card.getAttribute('data-guild-id') : null;
            const bumpBtn = guildId ? document.getElementById(`bump-btn-${guildId}`) : null;

            if (diff <= 0) {
                el.className = 'bump-time ready';
                el.innerHTML = '✨ Ready';
                if (bumpBtn) {
                    bumpBtn.removeAttribute('disabled');
                    bumpBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Bump`;
                }
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                const hStr = hours > 0 ? `${hours}h ` : '';
                const mStr = minutes < 10 ? `0${minutes}` : minutes;
                const sStr = seconds < 10 ? `0${seconds}` : seconds;

                el.className = 'bump-time cooldown';
                el.innerHTML = `<i class="fa-regular fa-clock pulse"></i> ${hStr}${mStr}m ${sStr}s`;
                if (bumpBtn) {
                    bumpBtn.setAttribute('disabled', 'true');
                    bumpBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Cooldown`;
                }
            }
        });
    }
    update();
    setInterval(update, 1000);
}

/**
 * 触发 Bump：向后端 POST 数据，并在成功后重新渲染卡片进行置顶
 */
async function triggerBump(guildId) {
    const cooldownTime = 2 * 60 * 60 * 1000;
    const fallbackNextTime = Date.now() + cooldownTime;

    try {
        const response = await fetch(`${API_BASE_URL}/server/bump`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guild_id: guildId })
        });

        if (response.ok) {
            const resData = await response.json();

            // 更新本地 Guild 数据的 next_bump_time 属性
            updateLocalGuildBumpTime(guildId, resData.next_bump_time);

            alert('Bump 成功！服务器已置顶，下一次 Bump 需等待 2 小时。');

            // 🔥 重新渲染网格，触发卡片重新排序置顶！
            renderServerGrid();
            return;
        }
    } catch (e) {
        console.warn("网络连接失败，使用本地缓存更新 Bump 状态:", e);
    }

    // 本地保底处理
    localStorage.setItem(`next_bump_${guildId}`, fallbackNextTime);
    updateLocalGuildBumpTime(guildId, fallbackNextTime);

    alert('Bump 成功（本地暂存）！服务器已移至顶部。');

    // 🔥 本地测试模式下也重新渲染排序
    renderServerGrid();
}

/**
 * 辅助函数：更新本地内存/localStorage 中的 Bump 时间
 */
function updateLocalGuildBumpTime(guildId, nextTime) {
    const savedGuilds = localStorage.getItem('starryboard_guilds');
    if (savedGuilds) {
        try {
            let guilds = JSON.parse(savedGuilds);
            guilds = guilds.map(g => {
                if (g.id === guildId) g.next_bump_time = nextTime;
                return g;
            });
            localStorage.setItem('starryboard_guilds', JSON.stringify(guilds));
        } catch (e) {
            console.error("更新本地 Guild 缓存失败:", e);
        }
    }
}

function logout() {
    localStorage.removeItem('starryboard_token');
    localStorage.removeItem('starryboard_user');
    localStorage.removeItem('starryboard_guilds');
    window.location.href = './index.html';
}