// ============================== 1. 配置与全局常量 ================================
const DISCORD_CLIENT_ID = '1513589513648345368';
const API_BASE_URL = 'http://localhost:5000/api'; // 根据你的实际后端端口配置

const getCallbackUrl = () => {
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    return `${window.location.origin}${basePath}/auth/callback.html`;
};

const REDIRECT_URI = encodeURIComponent(getCallbackUrl());
const SCOPES = encodeURIComponent('identify email guilds');

// ============================== 2. 登录/用户状态管理 ================================

/**
 * 挂载登录跳转事件
 */
function initLoginEvents() {
    const loginElements = document.querySelectorAll('.sb-btn-login, .js-login-btn');

    loginElements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            let basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            if (basePath === '') basePath = ''; // 防止根路径异常
            const rawCallbackUrl = `${window.location.origin}${basePath}/auth/callback.html`;
            const redirectUri = encodeURIComponent(rawCallbackUrl);
            console.log("【调试】本次跳转使用的 redirect_uri:", rawCallbackUrl);

            window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=${SCOPES}`;
        });
    });
}

/**
 * 检查本地是否有用户登录信息并更新 Header
 */
function checkAuthState() {
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    const savedUserJson = localStorage.getItem('starryboard_user');

    if (savedUserJson) {
        try {
            const user = JSON.parse(savedUserJson);

            // 隐藏登录按钮，显示用户头像区
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'block';

            // 设置用户名
            if (userName) userName.textContent = user.username || 'Discord User';

            // 设置头像
            if (userAvatar) {
                if (user.avatar) {
                    userAvatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
                } else {
                    const defaultAvatarIndex = (BigInt(user.id || 0) >> 22n) % 5n;
                    userAvatar.src = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
                }
            }
        } catch (e) {
            console.error("解析用户信息失败:", e);
            logout();
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userProfile) userProfile.style.display = 'none';
    }
}

/**
 * 下拉菜单与退出登录
 */
function initUserMenuEvents() {
    const toggle = document.getElementById('userMenuToggle');
    const dropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (toggle && dropdown) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }
}

function logout() {
    localStorage.removeItem('starryboard_user');
    localStorage.removeItem('starryboard_token');
    window.location.reload();
}

// ==================== 3. 首页搜索框点击/聚焦即跳转逻辑 ====================
function initSearchEvents() {
    const heroSearchInput = document.getElementById('heroSearchInput');
    const heroSearchForm = document.getElementById('heroSearchForm');

    const redirectToSearch = (query = '') => {
        window.location.href = query ? `search.html?q=${encodeURIComponent(query)}` : 'search.html';
    };

    if (heroSearchInput) {
        heroSearchInput.addEventListener('focus', () => {
            redirectToSearch(heroSearchInput.value.trim());
        });
    }

    if (heroSearchForm) {
        heroSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = heroSearchInput ? heroSearchInput.value.trim() : '';
            redirectToSearch(query);
        });
    }
}

// ==================== 4. 搜索页 (search.html) 参数读取逻辑 ====================
function initSearchPage() {
    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');

        if (queryParam) {
            searchInput.value = queryParam;
            const highlightEl = document.querySelector('.sb-highlight');
            if (highlightEl) {
                highlightEl.textContent = `"${queryParam}"`;
            }
        }

        searchInput.focus();
    }
}

// ==================== 5. 首页 Recently Bumped 渲染逻辑 ====================

const bumpedGrid = document.getElementById('recentlyBumpedGrid');

/**
 * 卡片 DOM 渲染函数
 */
function renderHomeBumpedCards(serversList) {
    if (!bumpedGrid) return;

    if (!Array.isArray(serversList) || serversList.length === 0) {
        bumpedGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #8a8f9d; padding: 40px 0;">
                <p>No recently bumped servers found.</p>
            </div>`;
        return;
    }

    // 🔒 确保无论后端传多少条，前端只渲染 Top 6
    const top6Servers = serversList.slice(0, 6);

    bumpedGrid.innerHTML = top6Servers.map((server) => {
        const safeServer = server || {};
        const name = safeServer.name || 'Unnamed Server';

        // 服务器 Icon 处理 (兼容 Discord CDN 图标路径与完整 URL)
        let icon = 'https://picsum.photos/100/100?blur=2';
        if (safeServer.icon) {
            icon = safeServer.icon.startsWith('http')
                ? safeServer.icon
                : `https://cdn.discordapp.com/icons/${safeServer.id}/${safeServer.icon}.png?size=128`;
        }

        const onlineCount = typeof safeServer.onlineCount === 'number' ? safeServer.onlineCount.toLocaleString() : (safeServer.approximate_presence_count || '0');

        // Bump 时间格式化
        let bumpedTime = safeServer.bumpedTime;
        if (!bumpedTime && safeServer.last_bump_time) {
            bumpedTime = formatTimeAgo(safeServer.last_bump_time);
        } else if (!bumpedTime && safeServer.next_bump_time) {
            // 如果只有下一次 bump 时间，换算出大约的上次 bump 时间
            const calculatedLastBump = safeServer.next_bump_time - (2 * 60 * 60 * 1000);
            bumpedTime = formatTimeAgo(calculatedLastBump);
        } else if (!bumpedTime) {
            bumpedTime = 'recently';
        }

        const rating = typeof safeServer.rating === 'number' ? safeServer.rating : 5.0;
        const reviewCount = typeof safeServer.reviewCount === 'number' ? safeServer.reviewCount : 0;
        const description = safeServer.description || 'No description provided for this server.';
        const tags = Array.isArray(safeServer.tags) ? safeServer.tags : [];
        const inviteUrl = safeServer.inviteUrl || `https://discord.gg/${safeServer.invite_code || ''}`;

        return `
        <div class="sb-card">
            <div>
                <div class="sb-card-header">
                    <img src="${icon}" alt="${escapeHtml(name)} Icon" class="sb-server-icon" onerror="this.src='https://picsum.photos/100/100?blur=2'">
                    <div style="min-width: 0; flex: 1;">
                        <div class="sb-card-meta">
                            <span class="sb-online-badge"><span class="sb-online-dot"></span> ${onlineCount} Online</span>
                            <span>• ${bumpedTime}</span>
                        </div>
                        <div class="sb-server-name">${escapeHtml(name)}</div>
                    </div>
                </div>
                <div class="sb-card-body">
                    <div class="sb-rating">
                        ${renderStars(rating)}
                        <span>(${reviewCount} reviews)</span>
                    </div>
                    ${tags.length > 0 ? `
                        <div class="sb-tags">
                            ${tags.map(tag => `<span class="sb-tag">${escapeHtml(String(tag).toUpperCase())}</span>`).join('')}
                        </div>
                    ` : ''}
                    <p class="sb-card-description">
                        ${escapeHtml(description)}
                    </p>
                </div>
            </div>
            <div class="sb-card-footer">
                <a href="${inviteUrl}" target="_blank" rel="noopener noreferrer" class="sb-btn-join" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
                    <i class="fa-brands fa-discord"></i> Join Server
                </a>
            </div>
        </div>
        `;
    }).join('');
}

/**
 * 星级评分 HTML 生成器
 */
function renderStars(rating = 0) {
    let starsHtml = '';
    const safeRating = Math.max(0, Math.min(5, rating));
    const fullStars = Math.floor(safeRating);
    const hasHalfStar = safeRating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
        starsHtml += `<i class="fa-solid fa-star"></i>`;
    }
    if (hasHalfStar) {
        starsHtml += `<i class="fa-solid fa-star-half-stroke"></i>`;
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += `<i class="fa-regular fa-star"></i>`;
    }
    return starsHtml;
}

/**
 * HTML 转义函数
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * 将时间戳转换为 "Xm ago" 或 "Xh ago"
 */
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'recently';
    const diff = Math.floor((Date.now() - timestamp) / 1000); // 差值（秒）

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * 加载首页 Recently Bumped 数据（从真实数据库 API 拉取）
 */
async function loadHomeBumpedServers() {
    try {
        let serversList = [];

        // 🚀【真实 API 调用】：从数据库拉取最近 Bump 的前 6 个服务器
        const response = await fetch(`${API_BASE_URL}/servers/recently-bumped?limit=6`);

        if (response.ok) {
            const result = await response.json();
            // 兼容返回格式是 { data: [...] } 或直接 [...]
            serversList = Array.isArray(result) ? result : (result.data || []);
        } else {
            console.warn(`API 请求未成功 [Status: ${response.status}]，尝试使用备用/模拟数据。`);
            serversList = generateHomeMockBumpedServers(6);
        }

        // 按最近 Bump 时间降序排序（确保最新 Bump 的在最上/最前）
        serversList.sort((a, b) => {
            const timeA = a.last_bump_time || (a.next_bump_time ? a.next_bump_time - 7200000 : 0);
            const timeB = b.last_bump_time || (b.next_bump_time ? b.next_bump_time - 7200000 : 0);
            return timeB - timeA;
        });

        renderHomeBumpedCards(serversList);

    } catch (error) {
        console.error("加载 Recently Bumped 服务器出错，降级显示保底数据:", error);
        // 网络不通时的兜底数据
        renderHomeBumpedCards(generateHomeMockBumpedServers(6));
    }
}



// ============================== 6. 页面初始化入口 ================================
document.addEventListener('DOMContentLoaded', () => {
    initLoginEvents();
    checkAuthState();
    initUserMenuEvents();
    initSearchEvents();
    initSearchPage();
    loadHomeBumpedServers();
});