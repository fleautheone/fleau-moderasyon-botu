/**
 * config.js
 * Discord Bot - Advanced Configuration System (Production Ready)
 * 
 * Bu dosya botun tüm ayarlarını merkezi olarak yönetir.
 * Güvenlik, validasyon ve performans odaklı tasarlanmıştır.
 */

require("dotenv").config();

/* ================= ENV VALIDATION ================= */
// Bot başlatılmadan önce zorunlu environment variables kontrol edilir.
// Eksikse uygulama hemen çöker (fail-fast yaklaşımı).
const REQUIRED_ENV = [
  "BOT_TOKEN",           // Discord bot tokeni (zorunlu)
  "MONGO_URI",           // MongoDB bağlantı stringi
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`❌ Kritik ENV eksik: ${key}. Lütfen .env dosyasını kontrol edin.`);
  }
}

/* ================= HELPERS ================= */

// Config objesini runtime'da değiştirilemez hale getirir (immutable).
// Güvenlik açısından çok önemlidir; yanlışlıkla config değiştirilmesini engeller.
const deepFreeze = (obj) => {
  if (typeof obj !== "object" || obj === null) return obj;
  
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object" && !Object.isFrozen(obj[key])) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
};

// Çeviri sistemi (i18n)
const LANG = process.env.BOT_LANG || "tr";

const LANGUAGES = {
  tr: {
    API_ERROR: "Beklenmeyen bir hata oluştu! Daha sonra tekrar deneyin veya destek sunucusuna katılın.",
    DAILY_SUCCESS: "Günlük ödülünü aldın! {coins} {currency} hesabına eklendi.",
    LEVEL_UP: "{member:tag}, **Seviye {level}** oldun! Tebrikler 🎉",
  },
  en: {
    API_ERROR: "Unexpected Backend Error! Try again later or contact support server.",
    DAILY_SUCCESS: "You claimed your daily reward! {coins} {currency} added to your account.",
    LEVEL_UP: "{member:tag}, You just advanced to **Level {level}**! Congratulations 🎉",
  },
};

// Gelişmiş çeviri fonksiyonu
// key → çeviri yapar, params varsa {key} yerlerini doldurur. Fallback İngilizce'dir.
const t = (key, params = {}) => {
  let str = LANGUAGES[LANG]?.[key] || LANGUAGES["en"]?.[key] || key;
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`{${k}}`, "g"), params[k]);
  });
  return str;
};

/* ================= VALIDATORS ================= */

// Belirli bir değerin izin verilen listede olup olmadığını kontrol eder.
const validateEnum = (value, allowedList, fieldName) => {
  if (!allowedList.includes(value)) {
    throw new Error(`❌ Geçersiz değer: ${fieldName} = ${value} | İzin verilen: ${allowedList.join(", ")}`);
  }
};

// URL'lerin http/https ile başlamasını kontrol eder (uyarı verir).
const validateURL = (url, fieldName) => {
  if (url && !url.startsWith("http")) {
    console.warn(`⚠️  Potansiyel geçersiz URL (${fieldName}): ${url}`);
  }
};

/* ================= MAIN CONFIG ================= */
const config = {
  // ====================== GENEL AYARLAR ======================
  LANGUAGE: LANG,                                      // Botun varsayılan dili (çeviri için)
  BOT_TOKEN: process.env.BOT_TOKEN,                    // Discord bot tokeni (.env'den alınır)
  MONGO_URI: process.env.MONGO_URI,                    // MongoDB bağlantı adresi
  OWNER_IDS: (process.env.OWNER_IDS || "").split(",")
    .map((id) => id.trim())
    .filter(Boolean),                                  // Bot sahibi kullanıcı ID'leri (virgülle ayrılmış)
  SUPPORT_SERVER: process.env.SUPPORT_SERVER || "https://discord.gg/xxxxxxxx", // Destek sunucusu linki

  // ====================== KOMUT SİSTEMİ ======================
  PREFIX_COMMANDS: {
    ENABLED: true,                                     // !prefix komutları aktif mi?
    DEFAULT_PREFIX: "!",                               // Varsayılan prefix
  },

  INTERACTIONS: {
    SLASH: true,                                       // Slash komutları (/komut) aktif mi?
    CONTEXT: true,                                     // Sağ tıklama (context menu) komutları aktif mi?
    GLOBAL: true,                                      // Komutlar global mi kaydedilsin? (false = sadece test sunucusu)
    TEST_GUILD_ID: process.env.TEST_GUILD_ID || "https://discord.gg/5vfssRfWcK", // Test sunucusu ID'si (hızlı komut yükleme için)
  },

  // ====================== GÖRÜNÜM ======================
  EMBED_COLORS: {
    BOT_EMBED: "#068ADD",      // Genel embed rengi
    TRANSPARENT: "#36393F",    // Arka plan / şeffaf embed
    SUCCESS: "#00A56A",        // Başarı mesajları
    ERROR: "#D61A3C",          // Hata mesajları
    WARNING: "#F7E919",        // Uyarı mesajları
  },

  // ====================== ÖNBELLEK ======================
  CACHE_SIZE: {
    GUILDS: parseInt(process.env.CACHE_GUILDS) || 100,   // Sunucu cache boyutu
    USERS: parseInt(process.env.CACHE_USERS) || 5000,    // Kullanıcı cache boyutu
    MEMBERS: parseInt(process.env.CACHE_MEMBERS) || 10000, // Üye cache boyutu (büyük sunucular için)
  },

  // ====================== GENEL MESAJLAR ======================
  MESSAGES: {
    API_ERROR: t("API_ERROR"),   // Genel API hatası mesajı
  },

  /* ================= ÖZELLİKLER (PLUGINS) ================= */

  AUTOMOD: {
    ENABLED: false,                  // Otomatik moderasyon sistemi
    LOG_EMBED: "#36393F",            // Automod log embed rengi
    DM_EMBED: "#36393F",             // Kullanıcıya DM uyarı rengi
  },

  DASHBOARD: {
    ENABLED: false,                  // Web yönetim paneli
    BASE_URL: process.env.BASE_URL || "http://localhost:8080",
    FAILURE_URL: process.env.FAILURE_URL || "http://localhost:8080",
    PORT: parseInt(process.env.PORT) || 8080,
  },

  ECONOMY: {
    ENABLED: false,                  // Ekonomi / para sistemi
    CURRENCY: "₺",                   // Para birimi
    DAILY_COINS: 100,                // Günlük ödül miktarı
    MIN_BEG_AMOUNT: 100,
    MAX_BEG_AMOUNT: 2500,
    MESSAGES: {
      DAILY_SUCCESS: t("DAILY_SUCCESS"),  // Günlük ödül başarı mesajı
    },
  },

  MUSIC: {
    ENABLED: false,                  // Müzik çalma sistemi
    IDLE_TIME: 60,                   // Boşta kalma süresi (saniye)
    MAX_SEARCH_RESULTS: 5,           // Maksimum arama sonucu
    DEFAULT_SOURCE: "SC",            // Varsayılan müzik kaynağı (YT, SC, SP...)
    LAVALINK_NODES: [                // Lavalink ses node'ları (müzik için zorunlu)
      {
        host: process.env.LAVALINK_HOST || "localhost",
        port: parseInt(process.env.LAVALINK_PORT) || 2333,
        password: process.env.LAVALINK_PASSWORD || "youshallnotpass",
        id: "Local Node",
        secure: false,
      },
    ],
  },

  GIVEAWAYS: {
    ENABLED: false,                  // Çekiliş sistemi
    REACTION: "🎁",
    START_EMBED: "#FF468A",
    END_EMBED: "#FF468A",
  },

  IMAGE: {
    ENABLED: false,                  // Resim düzenleme komutları
    BASE_API: process.env.IMAGE_API || "https://strangeapi.hostz.me/api",
  },

  INVITE: {
    ENABLED: false,                  // Davet takip sistemi
  },

  MODERATION: {
    ENABLED: false,                  // Moderasyon komutları (ban, kick, timeout vb.)
    EMBED_COLORS: {
      TIMEOUT: "#102027",
      UNTIMEOUT: "#4B636E",
      KICK: "#FF7961",
      SOFTBAN: "#AF4448",
      BAN: "#D32F2F",
      UNBAN: "#00C853",
      VMUTE: "#102027",
      VUNMUTE: "#4B636E",
      DEAFEN: "#102027",
      UNDEAFEN: "#4B636E",
      DISCONNECT: "RANDOM",          // Rastgele renk
      MOVE: "RANDOM",
    },
  },

  PRESENCE: {
    ENABLED: false,                  // Botun "oynuyor / izliyor" durumu
    STATUS: "online",                // online, idle, dnd
    TYPE: "WATCHING",                // PLAYING, WATCHING, LISTENING, COMPETING
    MESSAGE: [                       // Durum mesajları (rastgele döner)
      "{members} üye • {servers} sunucu",
    ],
  },

  STATS: {
    ENABLED: false,                  // Seviye / XP sistemi
    XP_COOLDOWN: 5,                  // XP kazanma bekleme süresi (saniye)
    DEFAULT_LVL_UP_MSG: t("LEVEL_UP"), // Seviye atlama mesajı
  },

  SUGGESTIONS: {
    ENABLED: false,                  // Öneri / suggestion sistemi
    EMOJI: {
      UP_VOTE: "⬆️",
      DOWN_VOTE: "⬇️",
    },
    DEFAULT_EMBED: "#4F545C",
    APPROVED_EMBED: "#43B581",
    DENIED_EMBED: "#F04747",
  },

  TICKET: {
    ENABLED: false,                  // Ticket (destek talebi) sistemi
    CREATE_EMBED: "#068ADD",
    CLOSE_EMBED: "#068ADD",
  },

  /* ================= UTILS ================= */
  t,   // Çeviri fonksiyonu (her yerden config.t("KEY", { param: "değer" }) şeklinde kullanılabilir)
};

/* ================= VALIDATIONS ================= */
validateEnum(config.PRESENCE.STATUS, ["online", "idle", "dnd"], "PRESENCE.STATUS");
validateEnum(config.PRESENCE.TYPE, ["PLAYING", "WATCHING", "LISTENING", "COMPETING", "STREAMING"], "PRESENCE.TYPE");

validateURL(config.SUPPORT_SERVER, "SUPPORT_SERVER");
validateURL(config.DASHBOARD.BASE_URL, "DASHBOARD.BASE_URL");
validateURL(config.DASHBOARD.FAILURE_URL, "DASHBOARD.FAILURE_URL");

/* ================= FINAL EXPORT ================= */
// Config'i dondur ve dışarı aktar.
// Artık hiçbir yerden config değiştirilemez.
module.exports = deepFreeze(config);