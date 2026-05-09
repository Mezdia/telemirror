// Window control buttons functionality (desktop only)
const minimizeBtn = document.getElementById('minimizeButton');
const closeBtn = document.getElementById('closeButton');
if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
        window.api.minimizeWindow();
    });
}
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        window.api.closeWindow();
    });
}

// Initialize app
const channelManager = new ChannelManager();
channelManager.init();
ThemeManager.init();
LanguageManager.init();
