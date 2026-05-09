const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { createServer } = require('./server/server');
const appConfig = require('./config/app.config');
const adsConfigLoader = require('./config/ads-config-loader');

const isDev = () => process.env.NODE_ENV === 'development';

// Fix GPU error by disabling GPU acceleration
app.disableHardwareAcceleration();

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    let mainWindow;
    let serverInstance;

    async function createWindow() {
        try {
            // Remove default menu
            Menu.setApplicationMenu(null);

            console.log('Creating server...');
            const serverResult = await createServer(appConfig.server.port);
            serverInstance = serverResult.server;
            actualServerPort = serverResult.port;
            console.log(`Server created on port ${actualServerPort}`);

            console.log('Creating window...');

            mainWindow = new BrowserWindow({
                width: appConfig.window.width,
                height: appConfig.window.height,
                frame: true,
                resizable: appConfig.window.resizable,
                title: 'TeleMirror',
                devTools: isDev(),
                devToolsKeyCombination: isDev(),
                icon: appConfig.paths.icon,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            // Set window title explicitly after creation
            mainWindow.setTitle('TeleMirror');

            // Force fullscreen after window is created and loaded
            // mainWindow.webContents.once('did-finish-load', () => {
            //     // Use simple fullscreen instead of true fullscreen
            //     mainWindow.setSimpleFullScreen(true);
            // });

            console.log('Loading HTML file...');
            mainWindow.loadFile(appConfig.paths.mainHtml);

            // Set title again after HTML is loaded
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.setTitle('TeleMirror');
            });

            console.log('Window loaded successfully');
        } catch (error) {
            console.error('Error in createWindow:', error);
        }
    }

    // IPC handlers
    ipcMain.on('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    ipcMain.handle('get-app-config', () => {
        return appConfig.app;
    });

    ipcMain.handle('get-ads-config', async () => {
        return await adsConfigLoader.loadAdsConfig();
    });

    // Store actual port globally for access in IPC handlers
    let actualServerPort = appConfig.server.port;

    ipcMain.handle('get-server-port', () => {
        return actualServerPort;
    });

    /**
     * Download a file from a URL and save to user-chosen location.
     */
    ipcMain.handle('download-file', async (_event, url, defaultFilename) => {
        try {
            const safeName = defaultFilename || url.split('/').pop() || 'download';
            const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: safeName,
                filters: [
                    { name: 'All Files', extensions: ['*'] },
                    { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
                    { name: 'Videos', extensions: ['mp4', 'webm', 'mkv'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'Save cancelled' };
            }

            return await downloadFileToPath(url, result.filePath);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Download a file from a URL to a local path, following redirects.
     * @param {string} url
     * @param {string} filePath
     * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
     */
    async function downloadFileToPath(url, filePath) {
        const protocol = url.startsWith('https') ? https : http;
        return new Promise((resolve) => {
            protocol.get(url, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    response.resume();
                    return resolve(downloadFileToPath(response.headers.location, filePath));
                }
                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve({ success: true, filePath });
                });
                fileStream.on('error', (err) => {
                    resolve({ success: false, error: err.message });
                });
            }).on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    // Cleanup function to close server
    function cleanup() {
        if (serverInstance) {
            console.log('Closing server...');
            serverInstance.close(() => {
                console.log('Server closed successfully');
            });
        }
    }

    // Handle app quit
    app.on('before-quit', () => {
        cleanup();
    });

    // Handle window close
    app.on('window-all-closed', () => {
        cleanup();
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.whenReady().then(createWindow);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
