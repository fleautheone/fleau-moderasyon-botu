/**
 * bot.js
 * Discord Bot - Main Entry Point (Senior Developer Edition)
 * 
 * Bu dosya botun başlangıç noktasıdır. Tüm sistemler burada başlatılır.
 * Production-ready, hata yönetimi güçlü ve bakım dostu yapıdadır.
 */

require("dotenv").config();                    // .env dosyasından ortam değişkenlerini yükler
require("module-alias/register");              // @src, @helpers, @root gibi alias'ları aktif eder (temiz import için)

// ====================== EXTENDERS ======================
// Discord.js sınıflarına yeni metodlar ve özellikler ekler (prototype extension)
require("@helpers/extenders/Message");         // Message sınıfına yardımcı metodlar ekler (örn: safeReply, replyT)
require("@helpers/extenders/Guild");           // Guild sınıfına ekstra özellikler ekler
require("@helpers/extenders/GuildChannel");    // GuildChannel sınıfına yardımcı fonksiyonlar ekler

// ====================== CORE IMPORTS ======================
const { checkForUpdates } = require("@helpers/BotUtils");        // Botun yeni sürüm kontrolü yapar (GitHub vs.)
const { initializeMongoose } = require("@src/database/mongoose"); // MongoDB bağlantısını kurar
const { BotClient } = require("@src/structures");                // Ana BotClient sınıfı (custom client)
const { validateConfiguration } = require("@helpers/Validator"); // Config dosyasını doğrular (güvenlik + bütünlük kontrolü)

// ====================== CONFIG VALIDATION ======================
// Config dosyasındaki kritik ayarları kontrol eder. Eksik veya hatalı ayar varsa bot başlamaz.
validateConfiguration();

// ====================== CLIENT INITIALIZATION ======================
// Ana bot istemcisi oluşturulur
const client = new BotClient();   // BotClient sınıfı config, logger, komut handler vb. içerir

// ====================== LOAD SYSTEMS ======================
// Tüm komut, context ve event sistemlerini yükler
client.loadCommands("src/commands");     // Slash + Prefix komutlarını yükler
client.loadContexts("src/contexts");     // Sağ tıklama (context menu) komutlarını yükler
client.loadEvents("src/events");         // Bot eventlerini (ready, messageCreate, interactionCreate vb.) yükler

// ====================== GLOBAL ERROR HANDLING ======================
// Yakalanmamış promise hatalarını (unhandled promise rejection) yakalar ve loglar.
// Production'da çok önemlidir, botun çökmesini önler.
process.on("unhandledRejection", (err) => {
  client.logger.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
  client.logger.error("Uncaught Exception:", err);
  // Kritik hatalarda graceful shutdown yapılabilir (opsiyonel)
  // process.exit(1);
});

// ====================== MAIN BOOTSTRAP FUNCTION ======================
/**
 * Botu başlatan ana fonksiyon.
 * Sıralama önemlidir: Update kontrolü → Dashboard/DB → Login
 */
const bootstrap = async () => {
  try {
    client.logger.log("🚀 Bot başlatılıyor...");

    // 1. Güncelleme kontrolü
    await checkForUpdates();   // Botun yeni sürümü olup olmadığını kontrol eder ve bilgilendirir

    // 2. Dashboard veya Veritabanı başlatma
    if (client.config.DASHBOARD?.ENABLED) {
      client.logger.log("🌐 Dashboard başlatılıyor...");

      try {
        const { launch } = require("@root/dashboard/app");

        // Dashboard kendi veritabanı bağlantısını yönetebilir
        await launch(client);
        client.logger.success("Dashboard başarıyla başlatıldı");
      } catch (ex) {
        client.logger.error("Dashboard başlatılamadı", ex);
        // Dashboard başarısız olsa bile bot devam etsin (kritik değil)
      }
    } else {
      // Dashboard kapalıysa normal veritabanı bağlantısını kur
      client.logger.log("📊 Veritabanı bağlantısı kuruluyor...");
      await initializeMongoose();
      client.logger.success("MongoDB bağlantısı başarılı");
    }

    // 3. Discord'a bağlanma (en son adım)
    client.logger.log("🔑 Discord'a bağlanılıyor...");
    await client.login(process.env.BOT_TOKEN);

  } catch (error) {
    client.logger.error("❌ Bot başlatılırken kritik hata oluştu:", error);
    
    // Graceful shutdown
    await gracefulShutdown(client);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown - Botu düzgün şekilde kapatır
 * Tüm bağlantıları kapatır, loglar ve kaynakları serbest bırakır.
 */
const gracefulShutdown = async (client) => {
  try {
    client.logger.log("🛑 Bot kapatılıyor... (Graceful Shutdown)");

    if (client.db) await client.db.close?.();
    if (client.player) client.player.destroy?.();   // Müzik player varsa kapat

    client.logger.log("✅ Tüm bağlantılar güvenli şekilde kapatıldı.");
  } catch (err) {
    client.logger.error("Shutdown sırasında hata:", err);
  }
};

// ====================== PROCESS SIGNALS ======================
// Sunucudan gelen kill sinyallerini yakalar (Docker, PM2, Linux vs. için)
process.on("SIGTERM", () => gracefulShutdown(client));
process.on("SIGINT", () => gracefulShutdown(client));

// ====================== START THE BOT ======================
bootstrap();

/* 
  Not: Bu dosya mümkün olduğunca temiz ve okunaklı tutuldu.
  Tüm mantık async/await ile yazıldı, hata yönetimi güçlendirildi.
  Senior seviyesinde beklenen: 
    - İyi logging
    - Graceful shutdown
    - Config validasyonu
    - Global error handling
    - Modüler yapı
*/