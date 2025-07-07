document.addEventListener("DOMContentLoaded", async () => {});

window.indexBridge.runStatus((event, runningStatus) => {
  let Status = document.getElementById("runStatus");
  Status.innerHTML = runningStatus ? "Running 🟢" : "NOT RUNNING 🔴";
});
