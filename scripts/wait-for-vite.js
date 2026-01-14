const http = require("http");

function checkViteServer(maxAttempts = 60, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts++;
      const req = http.get("http://localhost:5173", (res) => {
        if (res.statusCode === 200) {
          console.log("✓ Vite server is ready!");
          resolve();
        } else {
          if (attempts >= maxAttempts) {
            reject(new Error("Vite server did not become ready in time"));
          } else {
            setTimeout(check, interval);
          }
        }
      });

      req.on("error", (err) => {
        if (attempts >= maxAttempts) {
          reject(new Error("Vite server did not become ready in time"));
        } else {
          setTimeout(check, interval);
        }
      });
    };

    check();
  });
}

checkViteServer()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error waiting for Vite:", err.message);
    process.exit(1);
  });
