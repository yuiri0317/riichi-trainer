// Electron 主程序
//
// 為什麼不直接 loadFile(build/index.html)？
//   CRA 產物用絕對路徑（/static/js/...），file:// 下會全部 404。
//   這裡在 127.0.0.1 起一個只讀的靜態伺服器，再把視窗指向它，
//   路徑、hash 路由、Service Worker 全部照常運作，且完全不需要外網。

const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "build");

// 啟動日誌：優先寫在 exe 旁邊（安裝目錄可寫就寫在那裡），
// 那個目錄不可寫時才退回使用者資料夾。
const LOG_PATH = (() => {
    try {
        const dir = path.dirname(process.execPath);
        fs.accessSync(dir, fs.constants.W_OK);
        return path.join(dir, "startup.log");
    } catch {
        return path.join(app.getPath("userData"), "startup.log");
    }
})();

const writeLog = (message) => {
    try {
        const line = `[${new Date().toISOString()}] ${message}\n`;
        fs.appendFileSync(LOG_PATH, line);
    } catch {
        // 寫日誌失敗不影響主流程
    }
};

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
};

const startServer = () =>
    new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
            const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
            const filePath = path.join(ROOT, relative);

            // 防止路徑穿越
            if (!filePath.startsWith(ROOT)) {
                res.writeHead(403);
                res.end("Forbidden");
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    // 找不到就回退首頁（hash 路由不會用到，但保險）
                    fs.readFile(path.join(ROOT, "index.html"), (err2, html) => {
                        if (err2) {
                            res.writeHead(404);
                            res.end("Not found");
                            return;
                        }
                        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                        res.end(html);
                    });
                    return;
                }
                res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
                res.end(data);
            });
        });

        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => resolve(server.address().port));
    });

const createWindow = async () => {
    const port = await startServer();
    const origin = `http://127.0.0.1:${port}`;

    const win = new BrowserWindow({
        width: 1120,
        height: 840,
        minWidth: 720,
        minHeight: 600,
        title: "立直麻將練習",
        backgroundColor: "#ffffff",
        autoHideMenuBar: true,
        // 沒有簽名憑證時 exe 的圖示改不了，但視窗/工作列可以用這個
        icon: path.join(__dirname, "..", "build", "logo512.png"),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    win.loadURL(origin);
    writeLog("loading " + origin);

    // 站內連結留在視窗，外部連結交給系統瀏覽器
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.startsWith(origin)) shell.openExternal(url);
        return { action: "deny" };
    });
    win.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith(origin)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
};

// 只允許一個實例
writeLog("launch pid=" + process.pid);
if (!app.requestSingleInstanceLock()) {
    // 已有實例在跑：把它的視窗叫到前面，然後退出自己
    writeLog("another instance is running -> quit");
    app.quit();
} else {
    app.on("second-instance", () => {
        const [win] = BrowserWindow.getAllWindows();
        if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });

    app.whenReady().then(async () => {
        writeLog("app ready");
        try {
            Menu.setApplicationMenu(null);
            await createWindow();
            writeLog("window created");
        } catch (err) {
            writeLog("startup failed: " + (err && err.stack ? err.stack : err));
            dialog.showErrorBox("啟動失敗", String(err && err.stack ? err.stack : err));
            app.quit();
        }

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on("window-all-closed", () => {
        app.quit();
    });
}
