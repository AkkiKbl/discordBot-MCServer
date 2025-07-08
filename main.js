require("dotenv").config();
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");
const { spawn, exec } = require("child_process"); // Import spawn as well
const path = require("path");
const { app, Tray, Menu, BrowserWindow } = require("electron"); // ipcMain is not used in this snippet

// ────────────────────────────────────────────────────────────
// Discord client
// ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ────────────────────────────────────────────────────────────
// Globals
// ────────────────────────────────────────────────────────────
let mcProcess = null; // Child process that runs the .bat
let runStatus = false; // true ⇒ server running
let tray = null; // singleton Tray instance
let win; //browser window
let appQuitting = false; //Quit App when exited from tray

// ────────────────────────────────────────────────────────────
// Minecraft server paths
// ────────────────────────────────────────────────────────────
// Ensure SERVER_PATH is defined in your .env file, e.g., SERVER_PATH=C:\path\to\your\minecraft_server
const serverFolderPath = process.env.SERVER_PATH;
if (!serverFolderPath) {
  console.error(
    "ERROR: SERVER_PATH environment variable is not set. Please set it in your .env file."
  );
  app.quit(); // Exit if the path is not configured
}

const batFilePath = path.join(serverFolderPath, "run.bat");
const logFilePath = path.join(serverFolderPath, "logs", "latest.log");
const deleteLogFile = path.join(serverFolderPath, "logs/latest.log");

function deleteServerLog() {
  try {
    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
      console.log(`✅ Successfully deleted log file: ${logFilePath}`);
    } else {
      console.log(`ℹ️ Log file not found, skipping deletion: ${logFilePath}`);
    }
  } catch (err) {
    console.error(`❌ Error deleting log file ${logFilePath}:`, err);
  }
}
deleteServerLog();

// ────────────────────────────────────────────────────────────
// Tray helpers
// ────────────────────────────────────────────────────────────
function updateTrayMenu() {
  const iconPath = path.resolve(__dirname, "assets/minecraft_22400.ico");

  if (!tray) {
    // Create the tray once and reuse it forever
    try {
      tray = new Tray(iconPath);
      tray.setToolTip("MinecraftBot");
      tray.on("click", () => {
        if (win) {
          // Ensure window exists before showing
          win.show();
        }
      });
    } catch (error) {
      console.error("Failed to create Tray:", error);
      // Fallback or exit if tray cannot be created (e.g., icon not found)
      return;
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${runStatus ? "🟢" : "🔴"} Status: ${
        runStatus ? "Running" : "Stopped"
      }`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: runStatus ? "Stop Server" : "Start Server",
      click: () => {
        if (runStatus) {
          if (mcProcess && mcProcess.stdin.writable) {
            mcProcess.stdin.write("stop\n");
          } else if (mcProcess) {
            console.log(
              "Server stdin not writable, attempting to kill process."
            );
            mcProcess.kill();
          }

          setTimeout(() => {
            if (mcProcess && !mcProcess.killed) {
              console.log(
                "⚠️ Server did not stop on its own, killing process."
              );
              mcProcess.kill(); // Force kill if it didn't shut down
            }
            runStatus = false;
            mcProcess = null;
            updateTrayMenu();
          }, 5000);
        } else {
          // Start server using spawn
          mcProcess = spawn(batFilePath, [], {
            cwd: serverFolderPath,
            shell: true, // Crucial for .bat files on Windows
          });

          mcProcess.on("spawn", () => {
            runStatus = true;
            updateTrayMenu();
            console.log("Minecraft server started via Tray.");
          });

          mcProcess.on("close", (code) => {
            console.log(`🛑 Minecraft server exited with code ${code}`);
            runStatus = false;
            mcProcess = null;
            updateTrayMenu();
          });

          mcProcess.on("error", (err) => {
            console.error("❌ Failed to start Minecraft server via Tray:", err);
            runStatus = false;
            mcProcess = null;
            updateTrayMenu();
          });
        }
      },
    },
    {
      label: "Quit Bot",
      click: () => {
        appQuitting = true;
        if (mcProcess && mcProcess.stdin && mcProcess.stdin.writable) {
          mcProcess.stdin.write("stop\n");
          setTimeout(() => {
            if (mcProcess && !mcProcess.killed) {
              mcProcess.kill();
            }
            app.quit();
          }, 5000);
        } else {
          // If server is not running or stdin not writable, just quit
          if (mcProcess && !mcProcess.killed) {
            mcProcess.kill(); // Ensure it's killed if it exists but stdin isn't writable
          }
          app.quit();
        }
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ────────────────────────────────────────────────────────────
// Electron bootstrap
// ────────────────────────────────────────────────────────────

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Point to your preload script
      contextIsolation: true, // Recommended for security
      nodeIntegration: false, // Recommended for security
    },
  });

  // Send run status to renderer process every second
  setInterval(() => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("runStatus", runStatus);
    }
  }, 1000);

  // Read and send log data to renderer process every second
  setInterval(() => {
    if (win && !win.isDestroyed()) {
      fs.readFile(logFilePath, "utf8", (err, data) => {
        if (err) {
          // console.error("Error reading log file:", err);
          // Optionally send an error message to the renderer
          // win.webContents.send(
          //   "processData",
          //   `Error reading log: ${err.message}`
          // );
        } else {
          win.webContents.send("processData", data);
        }
      });
    }
  }, 1000);

  win.on("close", (event) => {
    if (!appQuitting) {
      event.preventDefault(); // Prevent actual close
      win.hide(); // Hide to tray instead
    } else {
      // If appQuitting is true, allow default close behavior (which leads to app.quit())
      if (mcProcess && !mcProcess.killed) {
        console.log("App quitting, ensuring Minecraft process is killed.");
        mcProcess.kill();
      }
    }
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();
  updateTrayMenu();

  // On macOS, activate the app when the dock icon is clicked and no windows are open
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // On macOS, it's common for applications and their menu bar to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin" || appQuitting) {
    app.quit();
  }
});

// ────────────────────────────────────────────────────────────
// Discord events
// ────────────────────────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // Ignore our own messages / other bots
  if (message.author.bot) return;

  const cmd = message.content.trim();

  switch (cmd) {
    // ─────── start server ───────
    case "!runServer": {
      if (mcProcess && !mcProcess.killed) {
        return message.reply("🚫 Minecraft server is already running.");
      }

      mcProcess = spawn(batFilePath, [], {
        cwd: serverFolderPath,
        shell: true, // Crucial for .bat files on Windows
      });

      // Optional: Pipe stdout/stderr to console for debugging
      // mcProcess.stdout.pipe(process.stdout);
      // mcProcess.stderr.pipe(process.stderr);

      mcProcess.on("spawn", () => {
        runStatus = true;
        updateTrayMenu();
        message.reply("✅ Starting Minecraft server...");
      });

      mcProcess.on("close", (code) => {
        console.log(`🛑 Minecraft server exited with code ${code}`);
        runStatus = false;
        mcProcess = null;
        updateTrayMenu();
        // Notify Discord channel if the server stops unexpectedly
        message.channel.send(`🛑 Minecraft server stopped with code ${code}.`);
      });

      mcProcess.on("error", (err) => {
        console.error("❌ Failed to start Minecraft server:", err);
        runStatus = false;
        mcProcess = null;
        updateTrayMenu();
        message.reply(`❌ Error while starting the server: ${err.message}`);
      });
      break;
    }

    // ─────── stop server ───────
    case "!stopServer": {
      if (!mcProcess || mcProcess.killed) {
        return message.reply("🚫 Server is not running.");
      }
      try {
        if (mcProcess.stdin && mcProcess.stdin.writable) {
          // Check if stdin is writable
          mcProcess.stdin.write("stop\n");
          message.reply("🛑 Stopping Minecraft server...");
        } else {
          console.log("Server stdin not writable, attempting to kill process.");
          mcProcess.kill("SIGTERM"); // Use SIGTERM for a softer kill
          message.reply(
            "🛑 Server stdin not writable, force-stopping Minecraft server..."
          );
        }

        setTimeout(() => {
          if (mcProcess && !mcProcess.killed) {
            console.log("⚠️ Server did not stop on its own, killing process.");
            mcProcess.kill(); // Force kill if it didn't shut down
            message.channel.send(
              "⚠️ Server did not stop gracefully, force-killed."
            );
          }
          runStatus = false;
          mcProcess = null;
          updateTrayMenu();
        }, 5000);
      } catch (err) {
        console.error("❌ Failed to stop Minecraft server:", err);
        message.reply(`❌ Error while stopping the server: ${err.message}`);
      }
      break;
    }

    // ─────── misc ───────
    case "!ping":
      message.reply("Pong!");
      break;

    default:
      if (cmd.startsWith("!echo ")) {
        message.channel.send(cmd.slice(6));
      }
  }
});

// ────────────────────────────────────────────────────────────
// Login & error handling
// ────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("Failed to login to Discord:", err);
  // Optionally, notify the user or quit the app if Discord login fails
  // app.quit();
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  // Consider graceful shutdown or logging for uncaught exceptions
});
