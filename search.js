// =========================================================================
// 1. 全局配置与状态管理
// =========================================================================
const API_BASE_URL = 'http://localhost:5000/api';

// 全局分页与筛选状态
const state = {
    currentPage: 1,
    pageSize: 12,       // 每页展示 12 个服务器
    totalItems: 0,      // 总服务器数量
    totalPages: 0,      // 动态计算出的总页数
    sortBy: 'bumped',   // 默认排序方式: bumped | newest | members
    allowNsfw: false,   // 默认关闭 NSFW
    searchQuery: ''     // 搜索关键词
};

// DOM 元素引用
let searchInput, searchHighlight, clearSearchBtn, recommendContainer;
let serverGrid, paginationContainer, totalServerCount;
let sortSelect, nsfwToggle;

// 防抖定时器
let searchDebounceTimer = null;

// =========================================================================
// 2. 页面 DOM 初始化与搜索框逻辑
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 绑定 DOM 引用
    searchInput = document.getElementById('searchInput');
    searchHighlight = document.getElementById('searchHighlight');
    clearSearchBtn = document.getElementById('clearSearchBtn');
    recommendContainer = document.getElementById('recommendTagsContainer');

    serverGrid = document.getElementById('serverGrid');
    paginationContainer = document.getElementById('paginationContainer');
    totalServerCount = document.getElementById('totalServerCount');

    sortSelect = document.getElementById('sortSelect');
    nsfwToggle = document.getElementById('nsfwToggle');

    // --- 初始化搜索框与 URL 参数 ---
    if (searchInput) {
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q') || '';

        if (queryParam) {
            searchInput.value = queryParam;
            state.searchQuery = queryParam;
            updateHighlight(queryParam);
        }

        // 监听实时输入（带有防抖处理，避免频繁频繁查库）
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            updateHighlight(val);
            state.searchQuery = val.trim();

            if (recommendContainer) {
                recommendContainer.querySelectorAll('.sb-tag-pill').forEach(el => el.classList.remove('active'));
            }

            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                loadServerData(1); // 输入改变后重置到第 1 页重新加载
            }, 300);
        });

        // 清空按钮逻辑
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                updateHighlight('');
                state.searchQuery = '';
                searchInput.focus();

                if (recommendContainer) {
                    recommendContainer.querySelectorAll('.sb-tag-pill').forEach(el => el.classList.remove('active'));
                }
                loadServerData(1);
            });
        }

        // 初始化推荐标签
        initRecommendTags(queryParam);
    }

    // 初始化筛选与排序监听
    initFilterEvents();

    // 第一次加载服务器数据
    loadServerData(1);
});

/**
 * 更新搜索大标题显示
 */
function updateHighlight(val) {
    if (!searchHighlight) return;
    const trimmed = val.trim();
    searchHighlight.textContent = trimmed ? `"${trimmed}"` : '""';
}

/**
 * 随机推荐标签逻辑
 */
function initRecommendTags(initialQuery) {
    if (!recommendContainer) return;

    const allTags = [
        'GAMING', 'ANIME', 'ESPORTS', 'MINECRAFT', 'COMMUNITY',
        'CHILL', 'MUSIC', 'DEV', 'ART', 'CYBERPUNK', 'ROBLOX', 'MEMES'
    ];

    const shuffled = [...allTags].sort(() => 0.5 - Math.random());
    const selectedTags = shuffled.slice(0, 5);

    selectedTags.forEach((tag) => {
        const tagAnchor = document.createElement('a');
        tagAnchor.href = '#';
        tagAnchor.className = 'sb-tag-pill';
        tagAnchor.textContent = `#${tag}`;

        if (initialQuery && initialQuery.toUpperCase() === tag) {
            tagAnchor.classList.add('active');
        }

        tagAnchor.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput.value = tag;
            state.searchQuery = tag;
            updateHighlight(tag);

            recommendContainer.querySelectorAll('.sb-tag-pill').forEach(el => el.classList.remove('active'));
            tagAnchor.classList.add('active');

            loadServerData(1);
        });

        recommendContainer.appendChild(tagAnchor);
    });
}

/**
 * 绑定筛选与排序控件事件
 */
function initFilterEvents() {
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            loadServerData(1);
        });
    }

    if (nsfwToggle) {
        nsfwToggle.addEventListener('change', (e) => {
            state.allowNsfw = e.target.checked;
            loadServerData(1);
        });
    }
}

// =========================================================================
// 3. 核心数据加载与 API 通信 (向数据库请求全量数据)
// =========================================================================

/**
 * 从数据库 API 分页加载服务器列表
 */
async function loadServerData(page = 1) {
    state.currentPage = page;

    try {
        let totalItems = 0;
        let serversList = [];

        // 构建请求参数
        const queryParams = new URLSearchParams({
            page: page,
            limit: state.pageSize,
            sort: state.sortBy,
            nsfw: state.allowNsfw ? 1 : 0,
            q: state.searchQuery
        });

        // 🚀【向后端 Flask 发起 API 请求】
        const response = await fetch(`${API_BASE_URL}/servers?${queryParams.toString()}`);

        if (response.ok) {
            const result = await response.json();
            totalItems = typeof result.total === 'number' ? result.total : 0;
            serversList = Array.isArray(result.list) ? result.list : [];
        } else {
            console.warn(`API 请求未成功 [Status: ${response.status}]，尝试使用本地回退方案`);
            const mockData = generateMockServers(45, page, state.pageSize, state.sortBy, state.allowNsfw, state.searchQuery);
            totalItems = mockData.total;
            serversList = mockData.list;
        }

        // 更新 UI 展示
        if (totalServerCount) {
            totalServerCount.textContent = totalItems.toLocaleString();
        }

        renderPagination(totalItems, page, state.pageSize);
        renderServerCards(serversList);

    } catch (error) {
        console.error("加载服务器数据出错，降级显示保底数据:", error);

        // 网络请求失败时的保底模拟
        const mockData = generateMockServers(45, page, state.pageSize, state.sortBy, state.allowNsfw, state.searchQuery);
        if (totalServerCount) totalServerCount.textContent = mockData.total.toLocaleString();
        renderPagination(mockData.total, page, state.pageSize);
        renderServerCards(mockData.list);
    }
}

// =========================================================================
// 4. 服务器卡片与渲染逻辑
// =========================================================================

/**
 * 渲染服务器卡片网格
 */
function renderServerCards(serversList) {
    if (!serverGrid) return;

    if (!Array.isArray(serversList) || serversList.length === 0) {
        serverGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #8a8f9d; padding: 60px 0;">
                <i class="fa-solid fa-server" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>No active servers found with current filters.</p>
            </div>`;
        return;
    }

    serverGrid.innerHTML = serversList.map((server) => {
        const safeServer = server || {};
        const name = safeServer.name || 'Unnamed Server';

        // 动态计算图标链接
        let icon = 'https://picsum.photos/100/100?blur=2';
        if (safeServer.icon) {
            icon = safeServer.icon.startsWith('http')
                ? safeServer.icon
                : `https://cdn.discordapp.com/icons/${safeServer.id}/${safeServer.icon}.png?size=128`;
        }

        const onlineCount = typeof safeServer.onlineCount === 'number' ? safeServer.onlineCount.toLocaleString() : (safeServer.approximate_presence_count || '0');

        // 计算动态 Bump 相对时间
        let bumpedTime = safeServer.bumpedTime;
        if (!bumpedTime && safeServer.last_bump_time) {
            bumpedTime = formatTimeAgo(safeServer.last_bump_time);
        } else if (!bumpedTime && safeServer.next_bump_time) {
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
                        <span>(${rating > 0 ? rating.toFixed(1) : '0.0'} • ${reviewCount} reviews)</span>
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

// =========================================================================
// 5. 分页器逻辑
// =========================================================================

function renderPagination(totalItems = 0, currentPage = 1, pageSize = 12) {
    if (!paginationContainer) return;

    const safeTotal = typeof totalItems === 'number' && totalItems >= 0 ? totalItems : 0;
    const totalPages = Math.ceil(safeTotal / pageSize);

    state.totalItems = safeTotal;
    state.currentPage = currentPage;
    state.totalPages = totalPages;

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';

    const isPrevDisabled = currentPage <= 1;
    html += `
        <button class="sb-page-btn ${isPrevDisabled ? 'disabled' : ''}" 
                data-page="${currentPage - 1}" ${isPrevDisabled ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Prev
        </button>
    `;

    const pages = getPaginationPages(currentPage, totalPages);

    pages.forEach(page => {
        if (page === '...') {
            html += `<span class="sb-page-dots">...</span>`;
        } else {
            const isActive = page === currentPage;
            html += `
                <button class="sb-page-btn ${isActive ? 'active' : ''}" data-page="${page}">
                    ${page}
                </button>
            `;
        }
    });

    const isNextDisabled = currentPage >= totalPages;
    html += `
        <button class="sb-page-btn ${isNextDisabled ? 'disabled' : ''}" 
                data-page="${currentPage + 1}" ${isNextDisabled ? 'disabled' : ''}>
            Next <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

    paginationContainer.innerHTML = html;
    bindPaginationEvents();
}

function getPaginationPages(current, total) {
    const delta = 1;
    const range = [];
    const pagesWithDots = [];

    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
            range.push(i);
        }
    }

    let lastItem;
    for (let i of range) {
        if (lastItem) {
            if (i - lastItem === 2) {
                pagesWithDots.push(lastItem + 1);
            } else if (i - lastItem !== 1) {
                pagesWithDots.push('...');
            }
        }
        pagesWithDots.push(i);
        lastItem = i;
    }

    return pagesWithDots;
}

function bindPaginationEvents() {
    const pageBtns = paginationContainer.querySelectorAll('.sb-page-btn:not(.disabled)');

    pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = parseInt(btn.getAttribute('data-page'), 10);

            if (targetPage && targetPage !== state.currentPage) {
                loadServerData(targetPage);

                const searchHero = document.querySelector('.sb-search-hero');
                if (searchHero) {
                    searchHero.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

// =========================================================================
// 6. 通用工具函数
// =========================================================================

function renderStars(rating = 0) {
    let starsHtml = '';
    const safeRating = Math.max(0, Math.min(5, rating));
    const fullStars = Math.floor(safeRating);
    const hasHalfStar = safeRating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) starsHtml += `<i class="fa-solid fa-star"></i>`;
    if (hasHalfStar) starsHtml += `<i class="fa-solid fa-star-half-stroke"></i>`;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) starsHtml += `<i class="fa-regular fa-star"></i>`;

    return starsHtml;
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'recently';
    const diff = Math.floor((Date.now() - timestamp) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

