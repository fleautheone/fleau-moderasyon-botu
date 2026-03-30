const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const loadEvents = () => {
    const dir = path.join(process.cwd(), "src/events");

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);

      delete require.cache[require.resolve(filePath)];

      const event = require(filePath);

      if (!event.name) continue;

      const handler = (...args) => event.execute(client, ...args);

      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }
    }

    client.logger.success(`⚡ Eventler yüklendi`);
  };

  loadEvents();

  /* ===== HOT RELOAD ===== */

  fs.watch(path.join(process.cwd(), "src/events"), (eventType, filename) => {
    if (!filename.endsWith(".js")) return;

    client.logger.warn(`♻️ Event reload: ${filename}`);

    loadEvents();
  });
};