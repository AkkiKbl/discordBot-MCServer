# MinecraftBot

A desktop application built with Electron that acts as a Discord bot to manage a Minecraft server. It provides a simple UI to view server status and logs, and allows starting/stopping the server via Discord commands or a system tray icon.

## Features

* **Discord Integration**: Start and stop your Minecraft server using Discord commands (`!runServer`, `!stopServer`).
* **Electron UI**: A minimalist desktop interface to monitor the server's running status and view real-time logs.
* **System Tray Control**: Conveniently start, stop, and check server status directly from your system tray.
* **Automatic Log Deletion**: Cleans up the `latest.log` file when the server starts

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js**: [Download & Install Node.js](https://nodejs.org/) (LTS version recommended).
* **npm** (comes with Node.js) or **Yarn**.
* **Minecraft Server**: A functional Minecraft server setup with a `run.bat` (or equivalent shell script for Linux/macOS) file to start it.
* **Discord Bot Token**: A token for your Discord bot. You can create a bot and get a token from the [Discord Developer Portal](https://discord.com/developers/applications).
* **Server Path**: Know the absolute path to your Minecraft server directory.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AkkiKbl/discordBot-MCServer.git
    cd discordBot-MCServer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Create a `.env` file:**
    In the root directory of the project, create a file named `.env` and add the following:
    ```
    DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
    SERVER_PATH=C:\path\to\your\minecraft_server_directory # Example for Windows
    # SERVER_PATH=/home/user/minecraft_server # Example for Linux/macOS
    ```
    Replace `YOUR_DISCORD_BOT_TOKEN_HERE` with your actual Discord bot token and `C:\path\to\your\minecraft_server_directory` with the absolute path to your Minecraft server folder.

### Project Structure (Key Files)

* `main.js`: The main Electron process, handling Discord bot logic, server process management, and inter-process communication.
* `preload.js`: A script that runs before the renderer process, exposing Node.js functionalities to the renderer in a secure way.
* `renderer.js`: The renderer process script, handling UI updates based on data from `main.js`.
* `index.html`: The user interface for the Electron application.
* `style.css`: Custom CSS for styling the Electron UI.
* `.env`: Configuration file for environment variables (Discord token, server path).
* `assets/minecraft_22400.ico`: Icon for the Electron application and system tray.

### Usage

1.  **Start the Electron application:**
    ```bash
    npm start
    # or
    yarn start
    ```
    The application will start, and an icon will appear in your system tray. A window showing the server status and logs will also open.

2.  **Manage Server via Discord:**
    * Invite your bot to your Discord server.
    * In a channel where the bot has permissions, type:
        * `!runServer`: To start the Minecraft server.
        * `!stopServer`: To gracefully stop the Minecraft server.

3.  **Manage Server via System Tray:**
    * Click the MinecraftBot icon in your system tray.
    * Select "Start Server" or "Stop Server" from the context menu.
    * "Quit Bot" will exit the application and attempt to stop the server if it's running.

4.  **Monitor Server via UI:**
    * The Electron window will display the current server status (Running/Stopped) and real-time logs from your Minecraft server's `latest.log` file.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/AkkiKbl/discordBot-MCServer/blob/main/LICENSE)  file for details.

---

### MIT License

Copyright (c) 2025 discordBot-MCServer


Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

