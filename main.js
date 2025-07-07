require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { exec } = require("child_process");
const path = require("path");
const { app, Tray, Menu, BrowserWindow, ipcMain } = require("electron");

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
let win;
let appQuitting = false;
// ────────────────────────────────────────────────────────────
// Tray helpers
// ────────────────────────────────────────────────────────────
function updateTrayMenu() {
  const iconPath = path.resolve(__dirname, "assets/minecraft_22400.ico");

  if (!tray) {
    // Create the tray once and reuse it forever
    tray = new Tray(iconPath);
    tray.setToolTip("MinecraftBot");
    tray.on("click", () => {
      win.show();
    });
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
          mcProcess.stdin.write("stop\n");

          setTimeout(() => {
            if (mcProcess && !mcProcess.killed) {
              console.log(
                "⚠️ Server did not stop on its own, killing process."
              );
              mcProcess.kill(); // Force kill if it didn't shut down
            }
          }, 5000);
          runStatus = false;
          mcProcess = null;
          updateTrayMenu();
        } else {
          mcProcess = exec(batFilePath, { cwd: serverFolderPath, shell: true });
          mcProcess.stdout.pipe(process.stdout);
          mcProcess.stderr.pipe(process.stderr);

          mcProcess.on("spawn", () => {
            runStatus = true;
            updateTrayMenu();
          });
        }
      },
    },
    {
      label: "Quit Bot",
      click: () => {
        appQuitting = true;
        if (mcProcess && !mcProcess.killed) mcProcess.kill();
        console.log("test");
        app.quit();
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
    },
  });

  setInterval(() => {
    win.webContents.send("runStatus", runStatus);
  }, 1000);

  win.on("close", (event) => {
    if (!appQuitting) event.preventDefault();
    win.hide();
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();
  updateTrayMenu();
});

// ────────────────────────────────────────────────────────────
// Minecraft server paths
// ────────────────────────────────────────────────────────────
const serverFolderPath = process.env.SERVER_PATH;
const batFilePath = path.join(serverFolderPath, "run.bat");

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

      mcProcess = exec(batFilePath, { cwd: serverFolderPath, shell: true });

      mcProcess.stdout.pipe(process.stdout);
      mcProcess.stderr.pipe(process.stderr);

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
      });

      mcProcess.on("error", (err) => {
        console.error("❌ Failed to start Minecraft server:", err);
        runStatus = false;
        mcProcess = null;
        updateTrayMenu();
        message.reply("❌ Error while starting the server.");
      });
      break;
    }

    // ─────── stop server ───────
    case "!stopServer": {
      if (!mcProcess || mcProcess.killed) {
        return message.reply("🚫 Server is not running.");
      }
      try {
        mcProcess.stdin.write("stop\n");
        message.reply("🛑 Stopping Minecraft server...");
        setTimeout(() => {
          if (mcProcess && !mcProcess.killed) {
            console.log("⚠️ Server did not stop on its own, killing process.");
            mcProcess.kill(); // Force kill if it didn't shut down
          }
        }, 5000);
        runStatus = false;
        mcProcess = null;
        updateTrayMenu();
      } catch (err) {
        console.error("❌ Failed to stop Minecraft server:", err);
        message.reply("❌ Error while stopping the server.");
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
client.login(process.env.DISCORD_TOKEN);

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});
