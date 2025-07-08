document.addEventListener("DOMContentLoaded", async () => {});

window.indexBridge.runStatus((event, runningStatus) => {
  let Status = document.getElementById("runStatus");
  Status.textContent = runningStatus ? "Running 🟢" : "NOT RUNNING 🔴";
});

window.dataBridge.processData((event, processData) => {
  let Data = document.getElementById("stdOutput");

  Data.textContent = processData;
});
