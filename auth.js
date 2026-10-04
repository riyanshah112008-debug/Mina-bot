// auth.js - 全站通用身份验证模块
const DISCORD_CLIENT_ID = '1513589513648345368';
const SCOPES = encodeURIComponent('identify email guilds');

function getCallbackUrl() {
    let basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    return `${window.location.origin}${basePath}/auth/callback.html`;
}

// 1. 初始化登录按钮点击事件
function initLoginEvents() {
    document.querySelectorAll('.js-login-btn').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const redirectUri = encodeURIComponent(getCallbackUrl());
            window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=${SCOPES}`;
        });
    });
}

// 2. 检查并渲染 Header 登录状态
function checkAuthState() {
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const infoBanner = document.getElementById('infoBanner'); // 首页顶部的 Sign in 提示条

    const savedUserJson = localStorage.getItem('starryboard_user');

    if (savedUserJson) {
        try {
            const user = JSON.parse(savedUserJson);

            // 存在用户缓存：隐藏 Login 按钮，显示用户 Profile
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'block';
            if (infoBanner) infoBanner.style.display = 'none';

            if (userName) userName.textContent = user.global_name || user.username || 'User';

            if (userAvatar) {
                userAvatar.src = user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png';
            }
        } catch (e) {
            console.error("用户信息解析失败:", e);
            logout();
        }
    } else {
        // 无缓存：显示 Login 按钮，隐藏 Profile
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userProfile) userProfile.style.display = 'none';
        if (infoBanner) infoBanner.style.display = 'block';
    }
}

// 3. 绑定下拉菜单与 Logout 点击事件
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

// 退出登录：清空 localStorage 并刷新页面
function logout() {
    localStorage.removeItem('starryboard_token');
    localStorage.removeItem('starryboard_user');
    localStorage.removeItem('starryboard_guilds');
    window.location.reload();
}

// 页面加载自动运行
document.addEventListener('DOMContentLoaded', () => {
    initLoginEvents();
    checkAuthState();
    initUserMenuEvents();
});