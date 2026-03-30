const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  client.plugins = new Map();

  const pluginsDir = path.join(process.cwd(), "src/plugins");

  if (!fs.existsSync(pluginsDir)) return;

  const plugins = fs.readdirSync(pluginsDir);

  for (const folder of plugins) {
    const pluginPath = path.join(pluginsDir, folder);
    const mainFile = path.join(pluginPath, "index.js");

    if (!fs.existsSync(mainFile)) continue;

    const plugin = require(mainFile);

    if (!plugin.name) continue;

    if (plugin.enabled === false) continue;

    plugin.init?.(client);

    client.plugins.set(plugin.name, plugin);

    client.logger.success(`🔌 Plugin yüklendi: ${plugin.name}`);
  }
};