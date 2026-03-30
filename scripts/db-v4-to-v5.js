require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const LANG = "tr";
const DRY_RUN = false;
const BATCH_SIZE = 200;

const messages = {
  tr: {
    title: "---------------\n!!! UYARI !!!\n---------------",
    warning: "Devam etmek istiyor musunuz? (e/h): ",
    starting: "\n🚀 Migration başlatılıyor...\n",
    success: "\n✅ Migration tamamlandı!\n",
    cancelled: "\n❌ İptal edildi.\n",
    dbConnected: "🔌 MongoDB bağlandı",
    noCollection: "📦 {name} bulunamadı, atlanıyor.",
    migrating: "📦 {name} migrate ediliyor...",
    completed: "✅ {name} tamamlandı → {count}",
  }
};

const t = (k, p = {}) => {
  let str = messages[LANG][k] || k;
  Object.keys(p).forEach(x => str = str.replace(`{${x}}`, p[x]));
  return str;
};

rl.question(t("title") + "\n" + t("warning"), async (answer) => {
  if (answer.toLowerCase() !== "e") {
    console.log(t("cancelled"));
    process.exit(0);
  }

  console.log(t("starting"));

  try {
    await runMigration();
    console.log(t("success"));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
});

async function runMigration() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(t("dbConnected"));

  const db = mongoose.connection.db;

  await migrateGuilds(db);
  await migrateSuggestions(db);
}

/* ================= HELPERS ================= */

async function collectionExists(db, name) {
  const col = await db.listCollections({ name }).toArray();
  return col.length > 0;
}

/* ================= GUILDS ================= */

async function migrateGuilds(db) {
  if (!(await collectionExists(db, "guilds"))) {
    return console.log(t("noCollection", { name: "guilds" }));
  }

  const col = db.collection("guilds");
  console.log(t("migrating", { name: "guilds" }));

  const cursor = col.find({}).batchSize(BATCH_SIZE);

  let bulk = [];
  let count = 0;

  for await (const doc of cursor) {
    const updateOps = { $set: {}, $unset: {} };
    let changed = false;

    if (doc.data?.owner?.id) {
      updateOps.$set["data.owner"] = doc.data.owner.id;
      changed = true;
    }

    if (doc.automod?.strikes === 5) {
      updateOps.$set["automod.strikes"] = 10;
      changed = true;
    }

    if (doc.automod?.action === "MUTE") {
      updateOps.$set["automod.action"] = "TIMEOUT";
      changed = true;
    }

    if (doc.automod?.anti_scam !== undefined) {
      updateOps.$set["automod.anti_spam"] = !!doc.automod.anti_scam;
      updateOps.$unset["automod.anti_scam"] = "";
      changed = true;
    }

    if (doc.ranking?.enabled) {
      updateOps.$set["stats.enabled"] = true;
      updateOps.$unset["ranking"] = "";
      changed = true;
    }

    if (changed) {
      if (!Object.keys(updateOps.$set).length) delete updateOps.$set;
      if (!Object.keys(updateOps.$unset).length) delete updateOps.$unset;

      bulk.push({
        updateOne: {
          filter: { _id: doc._id },
          update: updateOps
        }
      });
    }

    if (bulk.length >= BATCH_SIZE) {
      if (!DRY_RUN) await col.bulkWrite(bulk);
      count += bulk.length;
      bulk = [];
    }
  }

  if (bulk.length && !DRY_RUN) {
    await col.bulkWrite(bulk);
    count += bulk.length;
  }

  console.log(t("completed", { name: "guilds", count }));
}

/* ================= SUGGESTIONS ================= */

async function migrateSuggestions(db) {
  if (!(await collectionExists(db, "suggestions")) ||
      !(await collectionExists(db, "guilds"))) {
    return console.log(t("noCollection", { name: "suggestions" }));
  }

  const col = db.collection("suggestions");
  const guildsCol = db.collection("guilds");

  console.log(t("migrating", { name: "suggestions" }));

  // RAM-safe cache
  const cache = new Map();
  const guildCursor = guildsCol.find({}).batchSize(BATCH_SIZE);

  for await (const g of guildCursor) {
    cache.set(g._id.toString(), g);
  }

  const cursor = col.find({}).batchSize(BATCH_SIZE);

  let bulk = [];
  let count = 0;

  for await (const doc of cursor) {
    const guild = cache.get(doc.guild_id?.toString());
    if (!guild) continue;

    const updateOps = { $set: {}, $rename: {} };
    let changed = false;

    if (guild.suggestions?.channel_id && !doc.channel_id) {
      updateOps.$set.channel_id = guild.suggestions.channel_id;
      changed = true;
    }

    if (doc.createdAt) {
      updateOps.$rename.createdAt = "created_at";
      changed = true;
    }

    if (doc.updatedAt) {
      updateOps.$rename.updatedAt = "updated_at";
      changed = true;
    }

    if (changed) {
      if (!Object.keys(updateOps.$set).length) delete updateOps.$set;
      if (!Object.keys(updateOps.$rename).length) delete updateOps.$rename;

      bulk.push({
        updateOne: {
          filter: { _id: doc._id },
          update: updateOps
        }
      });
    }

    if (bulk.length >= BATCH_SIZE) {
      if (!DRY_RUN) await col.bulkWrite(bulk);
      count += bulk.length;
      bulk = [];
    }
  }

  if (bulk.length && !DRY_RUN) {
    await col.bulkWrite(bulk);
    count += bulk.length;
  }

  console.log(t("completed", { name: "suggestions", count }));
}