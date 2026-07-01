const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ActivityType,
  ChannelType,
  PermissionFlagsBits,
  FileBuilder,
  Partials
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// config.json dosyasını yükle
const configPath = path.join(__dirname, 'config.json');
let fileConfig = {};
if (fs.existsSync(configPath)) {
  try {
    fileConfig = require(configPath);
  } catch (e) {
    console.warn('config.json okunamadı, ortam değişkenleri (env) kullanılacak.');
  }
}

const config = {
  token: process.env.DISCORD_TOKEN || fileConfig.token,
  clientId: process.env.CLIENT_ID || fileConfig.clientId,
  guildId: process.env.GUILD_ID || fileConfig.guildId
};

if (!config.token || config.token === 'YOUR_DISCORD_BOT_TOKEN') {
  console.error('--------------------------------------------------');
  console.error('HATA: Lütfen geçerli bir bot tokenı girin!');
  console.error('config.json dosyasını düzenleyin veya DISCORD_TOKEN ortam değişkenini ayarlayın.');
  console.error('--------------------------------------------------');
  process.exit(1);
}

if (!config.clientId || config.clientId === 'YOUR_CLIENT_ID') {
  console.error('--------------------------------------------------');
  console.error('HATA: Lütfen geçerli bir Client ID (Uygulama Kimliği) girin!');
  console.error('config.json dosyasını düzenleyin veya CLIENT_ID ortam değişkenini ayarlayın.');
  console.error('--------------------------------------------------');
  process.exit(1);
}

const { commands } = require('./commands.js');
const dbPath = path.join(__dirname, 'database.json');

// Yardımcı fonksiyonlar: Veritabanı okuma/yazma
function loadDatabase() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({}, null, 2), 'utf8');
      return {};
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Veritabanı okunurken hata oluştu:', err);
    return {};
  }
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Veritabanı kaydedilirken hata oluştu:', err);
  }
}

// Canvas Çizim Yardımcı Fonksiyonu: Yuvarlatılmış Köşeli Dikdörtgen
function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeColor, strokeWidth) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill === true ? '#000' : fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = strokeColor || '#000';
    ctx.lineWidth = strokeWidth || 1;
    ctx.stroke();
  }
}

// Modern Canvas Görsel Oluşturucu
async function generateVerificationImage(member) {
  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  // Arka Plan Kartı (Kömür rengi #0c0f0d, Altın kenarlık #d4af37)
  drawRoundedRect(ctx, 10, 10, 880, 280, 25, '#0c0f0d', true, '#d4af37', 5);

  // Koyu Sarı/Altın Radial Işıma (Glow) efekti
  const glowGrad = ctx.createRadialGradient(500, 150, 50, 500, 150, 250);
  glowGrad.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(10, 10, 880, 280);

  // Kullanıcı Avatarını Yükle
  let avatarImg;
  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    avatarImg = await loadImage(avatarURL);
  } catch (error) {
    console.error('Avatar resmi yüklenemedi:', error);
  }

  // Avatarı dairesel olarak çiz
  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 150, 85, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, 65, 65, 170, 170);
  } else {
    // Avatar yüklenemezse isim baş harfiyle dairesel placeholder çiz
    ctx.fillStyle = '#555555';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(member.displayName.charAt(0).toUpperCase(), 150, 180);
    ctx.textAlign = 'left'; // Align sıfırla
  }
  ctx.restore();

  // Avatar Kenarlığı
  ctx.strokeStyle = '#0c0f0d';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(150, 150, 85, 0, Math.PI * 2, true);
  ctx.stroke();

  // Durum İkonu (Rahatsız Etmeyin - DND Kırmızı Durum Rozeti)
  ctx.fillStyle = '#f04747';
  ctx.beginPath();
  ctx.arc(210, 210, 18, 0, Math.PI * 2, true);
  ctx.fill();
  
  // DND Durum Çizgisi
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(199, 206, 22, 8);

  // Kullanıcı Ekran Adını (Display Name) yazdır (Otomatik boyut küçültme ile)
  let nameSize = 65;
  ctx.font = `bold ${nameSize}px sans-serif`;
  while (ctx.measureText(member.displayName).width > 500 && nameSize > 35) {
    nameSize -= 5;
    ctx.font = `bold ${nameSize}px sans-serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(member.displayName, 270, 125);

  // Kullanıcı Adını (@username) yazdır
  ctx.font = '36px sans-serif';
  ctx.fillStyle = '#7f8c8d';
  ctx.fillText(`@${member.user.username}`, 270, 175);

  // "Doğrulandınız!" Rozeti (Pill 1)
  ctx.fillStyle = '#14120c';
  drawRoundedRect(ctx, 270, 205, 190, 42, 10, true, false);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Doğrulandınız!', 270 + 95, 205 + 27);
  ctx.textAlign = 'left';

  // Discord'a Kayıt Tarihi (Pill 2)
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = member.user.createdAt.toLocaleDateString('tr-TR', options);
  
  ctx.font = '18px sans-serif';
  const dateWidth = ctx.measureText(dateStr).width + 30;
  
  ctx.fillStyle = '#14120c';
  drawRoundedRect(ctx, 475, 205, dateWidth, 42, 10, true, false);
  
  ctx.fillStyle = '#7f8c8d';
  ctx.textAlign = 'center';
  ctx.fillText(dateStr, 475 + dateWidth / 2, 205 + 27);
  ctx.textAlign = 'left';

  // Sağ Üst Köşe - CastellanCraft Altın Taç Damgası
  ctx.fillStyle = '#d4af37'; // Altın Sarısı
  ctx.beginPath();
  ctx.arc(830, 70, 25, 0, Math.PI * 2, true);
  ctx.fill();
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(830, 70, 22, 0, Math.PI * 2, true);
  ctx.stroke();

  // Taç Çizimi
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(818, 80);
  ctx.lineTo(815, 65);
  ctx.lineTo(822, 70);
  ctx.lineTo(830, 60);
  ctx.lineTo(838, 70);
  ctx.lineTo(845, 65);
  ctx.lineTo(842, 80);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer('image/png');
}

// Giriş-Çıkış Canvas Görsel Oluşturucu
async function generateWelcomeImage(member, isJoin) {
  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  // Renk Temaları: Giriş için Yeşil, Çıkış için Kırmızı
  const borderColor = isJoin ? '#155e3b' : '#991b1b';
  const glowColor = isJoin ? 'rgba(21, 94, 59, 0.15)' : 'rgba(153, 27, 27, 0.15)';
  const pillBgColor = isJoin ? '#060a08' : '#110606';
  const stampColor = isJoin ? '#155e3b' : '#991b1b';

  // Arka Plan Kartı (Kömür rengi #0c0f0d, Dinamik renkli kenarlık)
  drawRoundedRect(ctx, 10, 10, 880, 280, 25, '#0c0f0d', true, borderColor, 5);

  // Dinamik Radial Işıma (Glow) efekti
  const glowGrad = ctx.createRadialGradient(500, 150, 50, 500, 150, 250);
  glowGrad.addColorStop(0, glowColor);
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(10, 10, 880, 280);

  // Kullanıcı Avatarını Yükle
  let avatarImg;
  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    avatarImg = await loadImage(avatarURL);
  } catch (error) {
    console.error('Avatar resmi yüklenemedi:', error);
  }

  // Avatarı dairesel olarak çiz
  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 150, 85, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, 65, 65, 170, 170);
  } else {
    ctx.fillStyle = '#555555';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U', 150, 180);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // Avatar Kenarlığı
  ctx.strokeStyle = '#0c0f0d';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(150, 150, 85, 0, Math.PI * 2, true);
  ctx.stroke();

  // Durum İkonu (Rahatsız Etmeyin - DND Kırmızı Durum Rozeti)
  ctx.fillStyle = '#f04747';
  ctx.beginPath();
  ctx.arc(210, 210, 18, 0, Math.PI * 2, true);
  ctx.fill();
  
  // DND Durum Çizgisi
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(199, 206, 22, 8);

  const displayName = member.displayName || member.user.username;
  const username = member.user.username;

  // Kullanıcı Ekran Adını (Display Name) yazdır (Otomatik boyut küçültme ile)
  let nameSize = 65;
  ctx.font = `bold ${nameSize}px sans-serif`;
  while (ctx.measureText(displayName).width > 500 && nameSize > 35) {
    nameSize -= 5;
    ctx.font = `bold ${nameSize}px sans-serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(displayName, 270, 125);

  // Kullanıcı Adını (@username) yazdır
  ctx.font = '36px sans-serif';
  ctx.fillStyle = '#7f8c8d';
  ctx.fillText(`@${username}`, 270, 175);

  // Pill 1: Giriş / Çıkış Durum Rozeti
  ctx.fillStyle = pillBgColor;
  const pillText = isJoin ? 'Sunucumuza Hoşgeldiniz!' : 'Sunucumuzdan Ayrıldı!';
  
  ctx.font = 'bold 18px sans-serif';
  const pill1Width = ctx.measureText(pillText).width + 40;
  drawRoundedRect(ctx, 270, 205, pill1Width, 42, 10, true, false);
  
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(pillText, 270 + pill1Width / 2, 205 + 27);
  ctx.textAlign = 'left';

  // Pill 2: Hesap Açılış Tarihi
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = member.user.createdAt ? member.user.createdAt.toLocaleDateString('tr-TR', options) : 'Bilinmiyor';
  
  ctx.font = '18px sans-serif';
  const dateWidth = ctx.measureText(dateStr).width + 30;
  
  ctx.fillStyle = pillBgColor;
  drawRoundedRect(ctx, 270 + pill1Width + 15, 205, dateWidth, 42, 10, true, false);
  
  ctx.fillStyle = '#7f8c8d';
  ctx.textAlign = 'center';
  ctx.fillText(dateStr, 270 + pill1Width + 15 + dateWidth / 2, 205 + 27);
  ctx.textAlign = 'left';

  // Sağ Üst Köşe - Giriş / Çıkış Damgası
  ctx.fillStyle = stampColor;
  ctx.beginPath();
  ctx.arc(830, 70, 25, 0, Math.PI * 2, true);
  ctx.fill();
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(830, 70, 22, 0, Math.PI * 2, true);
  ctx.stroke();

  // Stamp metni çiz
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isJoin ? 'WELCOME' : 'GOODBYE', 830, 73);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// Harici Uygulamaları (User Apps) Engelleme Denetimi
async function disableExternalApps(guild) {
  try {
    const everyoneRole = guild.roles.everyone;
    
    // 1. @everyone rolünün genel izinlerinden kaldır
    if (everyoneRole.permissions.has(PermissionFlagsBits.UseExternalApps)) {
      try {
        const newPermissions = everyoneRole.permissions.remove(PermissionFlagsBits.UseExternalApps);
        await everyoneRole.setPermissions(newPermissions, 'Harici uygulamaların kullanımını engelleme.');
        console.log(`[HARİCİ UYGULAMA ENGELİ] @everyone rolünden harici uygulama kullanma izni kaldırıldı.`);
      } catch (err) {
        console.error(`@everyone rol yetkisi güncellenirken hata oluştu (Sunucu: ${guild.name}):`, err);
      }
    }

    // 2. Mevcut tüm kanalların izinlerini denetle ve kapat
    const channels = await guild.channels.fetch();
    for (const [_, channel] of channels) {
      if (!channel) continue;
      
      const overwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
      if (!overwrite || overwrite.deny.has(PermissionFlagsBits.UseExternalApps) === false) {
        try {
          await channel.permissionOverwrites.edit(everyoneRole, {
            UseExternalApps: false
          });
          console.log(`[HARİCİ UYGULAMA ENGELİ] #${channel.name} kanalında harici uygulamalar engellendi.`);
        } catch (err) {
          // Botun yetkisinin olmadığı kanallarda hata verebilir, yoksay
        }
      }
    }
  } catch (error) {
    console.error('Harici uygulamalar engellenirken genel hata oluştu:', error);
  }
}

// Transcript oluşturma fonksiyonu (mesajları .txt formatına çevirir)
async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sortedMessages = [...messages.values()].reverse();
  
  let transcriptText = `CastellanCraft Destek Talebi Görüşme Kayıtları\nKanal: #${channel.name}\nTarih: ${new Date().toLocaleString('tr-TR')}\n--------------------------------------------------\n\n`;
  
  for (const msg of sortedMessages) {
    if (msg.author.bot) continue;
    const date = new Date(msg.createdTimestamp).toLocaleString('tr-TR');
    transcriptText += `[${date}] ${msg.author.tag}: ${msg.content}\n`;
    if (msg.attachments.size > 0) {
      msg.attachments.forEach(att => {
        transcriptText += `  -> Dosya eki: ${att.url}\n`;
      });
    }
  }
  return Buffer.from(transcriptText, 'utf-8');
}

// Yetkili Rol / Yönetici Kontrol Fonksiyonu
function isStaff(member) {
  if (!member) return false;
  // Yönetici yetkisi varsa izin ver
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  // 1521976272664924181 ve 1521975994230116564 rollerinden birine sahipse izin ver
  const staffRoles = ['1521976272664924181', '1521975994230116564'];
  return member.roles.cache.some(role => staffRoles.includes(role.id));
}

// Discord İstemcisini (Client) Başlat
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.User,
    Partials.GuildMember,
    Partials.Channel
  ]
});

// Slash Komutlarını Kaydetme/Yenileme Fonksiyonu
async function registerCommands() {
  const commandsData = Object.values(commands).map(cmd => cmd.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('Slash komutları yenileniyor (deploying)...');
    
    if (config.guildId && config.guildId.trim() !== '') {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandsData }
      );
      console.log(`[BAŞARILI] Komutlar belirtilen test sunucusuna (${config.guildId}) kaydedildi.`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandsData }
      );
      console.log('[BAŞARILI] Komutlar küresel (global) olarak başarıyla yenilendi.');
    }
  } catch (error) {
    console.error('Komutlar yenilenirken bir hata oluştu:', error);
  }
}

// Bot hazır olduğunda çalışacak event
client.once('ready', async () => {
  console.log(`🤖 Bot başarıyla giriş yaptı: ${client.user.tag}`);
  
  // Bot durumunu ayarla (DND - Rahatsız Etmeyin ve Castellan Craft | Season I)
  client.user.setPresence({
    activities: [{ 
      name: 'Castellan Craft | Season I', 
      type: ActivityType.Playing 
    }],
    status: 'dnd'
  });

  await registerCommands();

  // Harici uygulamaları tüm sunucularda engelle
  for (const [_, guild] of client.guilds.cache) {
    await disableExternalApps(guild);
  }
});

// Etkileşimleri (Interactions) Dinle
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = commands[interaction.commandName];
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const errContainer = new ContainerBuilder()
        .setAccentColor(0xE74C3C)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('⚠️ **Hata!**\n\nBu komut çalıştırılırken bir hata oluştu.')
        );
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ components: [errContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
      } else {
        await interaction.reply({ components: [errContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
      }
    }
  } 
  
  // Buton Tıklamalarını Yönet
  else if (interaction.isButton()) {
    const userId = interaction.user.id;
    const db = loadDatabase();
    
    // 1. DOĞRULA BUTONU
    if (interaction.customId === 'verify_user') {
      const modal = new ModalBuilder()
        .setCustomId('verify_modal')
        .setTitle('CastellanCraft Doğrulama Formu');

      const nameInput = new TextInputBuilder()
        .setCustomId('verify_name')
        .setLabel('Adınız')
        .setPlaceholder('Lütfen gerçek adınızı yazın')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const mcInput = new TextInputBuilder()
        .setCustomId('verify_mc')
        .setLabel('Minecraft Kullanıcı Adınız')
        .setPlaceholder('Minecraft adınızı (IGN) yazın')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(nameInput);
      const secondRow = new ActionRowBuilder().addComponents(mcInput);

      modal.addComponents(firstRow, secondRow);
      await interaction.showModal(modal);
    }

    // 1b. İSTEK/ÖNERİ GÖNDER BUTONU
    else if (interaction.customId === 'send_suggestion') {
      const modal = new ModalBuilder()
        .setCustomId('suggestion_modal')
        .setTitle('İstek ve Öneri Formu');

      const suggestionInput = new TextInputBuilder()
        .setCustomId('suggestion_input')
        .setLabel('İstek veya Öneriniz')
        .setPlaceholder('Lütfen sunucumuz için istek veya önerinizi yazınız...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(suggestionInput);
      modal.addComponents(firstRow);
      await interaction.showModal(modal);
    }

    // 1c. HATA BİLDİR BUTONU
    else if (interaction.customId === 'send_bug_report') {
      const modal = new ModalBuilder()
        .setCustomId('bug_report_modal')
        .setTitle('Hata Bildirim Formu');

      const bugInput = new TextInputBuilder()
        .setCustomId('bug_input')
        .setLabel('Karşılaştığınız Hata')
        .setPlaceholder('Lütfen karşılaştığınız hatayı detaylıca yazınız...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(bugInput);
      modal.addComponents(firstRow);
      await interaction.showModal(modal);
    }

    // 2. DESTEK TALEBİ OLUŞTURMA BUTONU
    else if (interaction.customId === 'create_ticket') {
      const guild = interaction.guild;
      if (!guild) return;

      const categoryId = '1521980856493932574';
      const parentCategory = guild.channels.cache.get(categoryId);

      // İzin Overwrite Ayarı
      const overwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        },
        {
          id: '1521976272664924181', // Yetkili Rol 1
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        },
        {
          id: '1521975994230116564', // Yetkili Rol 2
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        }
      ];

      try {
        // Yeni destek kanalı aç
        const ticketChannel = await guild.channels.create({
          name: `🔖┆${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: parentCategory ? parentCategory.id : null,
          permissionOverwrites: overwrites
        });

        // Kanal içine Destek Yönetim Paneli gönder
        const controlPanel = new ContainerBuilder()
          .setAccentColor(0xD4AF37) // Altın sarısı
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# [Destek Paneli](https://discord.gg/castellancraft)')
          )
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder()
                .setURL('https://resmim.net/cdn/2026/07/02/CcrQWT.png')
                .setDescription('CastellanCraft Destek Görseli')
            )
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Destek ekibimiz en kısa sürede sizinle iletişime geçecektir. Lütfen sorununuzu detaylı bir şekilde açıklayınız.\n\nTalebi yönetmek için aşağıdaki butonları kullanabilirsiniz.')
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Destek Sonlandır')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('ticket_add_member')
                .setLabel('Talebe Üye Ekle')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('ticket_remove_member')
                .setLabel('Talepten Üye Çıkar')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('ticket_save_transcript')
                .setLabel('Görüşmeleri Kaydet')
                .setStyle(ButtonStyle.Secondary)
            )
          );

        await ticketChannel.send({
          components: [controlPanel],
          flags: [MessageFlags.IsComponentsV2]
        });

        // Kullanıcıya ephemeral başarı mesajı gönder
        await interaction.reply({
          content: `✅ **Destek Kanalı Oluşturuldu**\n\nDestek talebiniz başarıyla oluşturulmuştur: <#${ticketChannel.id}>`,
          flags: [MessageFlags.Ephemeral]
        });

      } catch (error) {
        console.error('Destek kanalı açılırken hata oluştu:', error);
        await interaction.reply({
          content: '⚠️ **Hata**\n\nDestek kanalı oluşturulurken sistemsel bir hata meydana gelmiştir. Lütfen sunucu yöneticileri ile iletişime geçiniz.',
          flags: [MessageFlags.Ephemeral]
        });
      }
    }

    // 3. ÜYE EKLE BUTONU (YETKİ KONTROLÜ EKLENDİ)
    else if (interaction.customId === 'ticket_add_member') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '⚠️ **Yetki Hatası**\n\nBu işlemi gerçekleştirmek için yetkili rolüne veya Yönetici yetkisine sahip olmalısınız.',
          flags: [MessageFlags.Ephemeral]
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('ticket_add_member_modal')
        .setTitle('Destek Talebine Üye Ekle');

      const memberIdInput = new TextInputBuilder()
        .setCustomId('member_id_input')
        .setLabel('Eklenecek Üyenin Discord ID\'si')
        .setPlaceholder('Örn: 578816597054193664')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(memberIdInput));
      await interaction.showModal(modal);
    }

    // 4. ÜYE ÇIKAR BUTONU (YETKİ KONTROLÜ EKLENDİ)
    else if (interaction.customId === 'ticket_remove_member') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '⚠️ **Yetki Hatası**\n\nBu işlemi gerçekleştirmek için yetkili rolüne veya Yönetici yetkisine sahip olmalısınız.',
          flags: [MessageFlags.Ephemeral]
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('ticket_remove_member_modal')
        .setTitle('Destek Talebinden Üye Çıkar');

      const memberIdInput = new TextInputBuilder()
        .setCustomId('member_id_input')
        .setLabel('Çıkarılacak Üyenin Discord ID\'si')
        .setPlaceholder('Örn: 578816597054193664')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(memberIdInput));
      await interaction.showModal(modal);
    }

    // 5. GÖRÜŞMELERİ KAYDET BUTONU (YETKİ KONTROLÜ EKLENDİ)
    else if (interaction.customId === 'ticket_save_transcript') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '⚠️ **Yetki Hatası**\n\nBu işlemi gerçekleştirmek için yetkili rolüne veya Yönetici yetkisine sahip olmalısınız.',
          flags: [MessageFlags.Ephemeral]
        });
      }

      const transcriptChannelId = db.settings ? db.settings.transcriptChannelId : null;
      if (!transcriptChannelId) {
        return interaction.reply({
          content: '⚠️ **Hata**\n\nTranscript günlük kanalı henüz ayarlanmamıştır. Lütfen yöneticinizden `/destek-transcript` ayarını yapmasını talep ediniz.',
          flags: [MessageFlags.Ephemeral]
        });
      }

      const logChannel = client.channels.cache.get(transcriptChannelId);
      if (!logChannel) {
        return interaction.reply({
          content: '⚠️ **Hata**\n\nBelirlenen log kanalı bulunamamıştır.',
          flags: [MessageFlags.Ephemeral]
        });
      }

      try {
        await interaction.deferReply();

        const transcriptBuffer = await generateTranscript(interaction.channel);
        const attachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${interaction.channel.name}.txt` });

        // Log kanalı V2 formatı
        const logContainer = new ContainerBuilder()
          .setAccentColor(0xD4AF37) // Altın Sarısı
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# [Destek Transcript (Kaydedildi)](https://discord.gg/castellancraft)')
          )
          .addFileComponents(
            new FileBuilder()
              .setURL(`attachment://transcript-${interaction.channel.name}.txt`)
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('log_ticket_saver')
                .setLabel(`Kaydeden: ${interaction.user.username}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('log_ticket_name_save')
                .setLabel(`Talep: ${interaction.channel.name}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          );

        await logChannel.send({
          components: [logContainer],
          files: [attachment],
          flags: [MessageFlags.IsComponentsV2]
        });

        await interaction.editReply({
          content: '✅ **Konuşmalar Kaydedildi**\n\nTüm konuşma geçmişi başarıyla log kanalına yedeklenmiştir.'
        });

      } catch (error) {
        console.error('Transcript kaydedilirken hata:', error);
        await interaction.followUp({
          content: '⚠️ **Hata**\n\nTranscript oluşturulurken veya log kanalına gönderilirken bir hata oluştu.',
          flags: [MessageFlags.Ephemeral]
        });
      }
    }

    // 6. DESTEK SONLANDIR BUTONU
    else if (interaction.customId === 'close_ticket') {
      const transcriptChannelId = db.settings ? db.settings.transcriptChannelId : null;
      
      try {
        await interaction.deferReply();

        const transcriptBuffer = await generateTranscript(interaction.channel);
        const attachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${interaction.channel.name}.txt` });

        // Transcript kanalı ayarlıysa log gönder
        if (transcriptChannelId) {
          const logChannel = client.channels.cache.get(transcriptChannelId);
          if (logChannel) {
            const logContainer = new ContainerBuilder()
              .setAccentColor(0xE74C3C) // Kırmızı (Sonlandırıldı)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# [Destek Transcript (Sonlandırıldı)](https://discord.gg/castellancraft)')
              )
              .addFileComponents(
                new FileBuilder()
                  .setURL(`attachment://transcript-${interaction.channel.name}.txt`)
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('log_ticket_closer')
                    .setLabel(`Kapatan: ${interaction.user.username}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('log_ticket_name_close')
                    .setLabel(`Talep: ${interaction.channel.name}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
                )
              );

            await logChannel.send({
              components: [logContainer],
              files: [attachment],
              flags: [MessageFlags.IsComponentsV2]
            });
          }
        }

        await interaction.editReply({
          content: '⚠️ **Destek Sonlandırılıyor**\n\nGörüşme kayıtları log kanalına iletilmiştir. Bu kanal 5 saniye içerisinde tamamen silinecektir...'
        });

        // 5 Saniye sonra kanalı sil
        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (e) {
            console.error('Kanal silinirken hata oluştu (belki zaten silinmişti):', e);
          }
        }, 5000);

      } catch (error) {
        console.error('Destek kapatılırken hata:', error);
        await interaction.followUp({
          content: '⚠️ **Hata**\n\nDestek kapatılırken bir hata oluştu.',
          flags: [MessageFlags.Ephemeral]
        });
      }
    }
  }

  // Modal Gönderimlerini Yönet
  else if (interaction.isModalSubmit()) {
    
    // 1. DOĞRULAMA MODAL SUBMIT
    if (interaction.customId === 'verify_modal') {
      try {
        // Discord API zaman aşımını engellemek için etkileşimi hemen defer et (Ertele)
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const ad = interaction.fields.getTextInputValue('verify_name');
        const mcAdi = interaction.fields.getTextInputValue('verify_mc');
        const member = interaction.member;

        if (!member) {
          return interaction.editReply({
            content: 'HATA: Bu işlem sadece bir sunucu içerisindeyken gerçekleştirilebilir.'
          });
        }

        const roleToRemoveId = '1521976846835777637';
        const roleToAddId = '1521976184487805069';

        let actionLog = [];

        if (member.roles.cache.has(roleToRemoveId)) {
          await member.roles.remove(roleToRemoveId);
          actionLog.push(`• <@&${roleToRemoveId}> rolü üzerinizden alındı.`);
        } else {
          actionLog.push(`• Üzerinizde alınacak <@&${roleToRemoveId}> rolü bulunamadı.`);
        }

        if (!member.roles.cache.has(roleToAddId)) {
          await member.roles.add(roleToAddId);
          actionLog.push(`• <@&${roleToAddId}> rolü size başarıyla verildi.`);
        } else {
          actionLog.push(`• <@&${roleToAddId}> rolüne zaten sahipsiniz.`);
        }

        const db = loadDatabase();
        db[interaction.user.id] = {
          ad: ad,
          minecraftName: mcAdi,
          discordUsername: interaction.user.username,
          verifiedAt: new Date().toISOString()
        };
        saveDatabase(db);

        await interaction.editReply({
          content: '✅ **Başarılı** - Sunucuya kaydınız başarıyla tamamlanmıştır.'
        });

        // Log Kanalına Altın Temalı V2 Embed ve Görsel Gönderme
        const logChannelId = db.settings ? db.settings.logChannelId : null;
        if (logChannelId) {
          const logChannel = client.channels.cache.get(logChannelId);
          if (logChannel) {
            console.log(`Log kanalı bulundu, Canvas görseli hazırlanıyor: ${logChannelId}`);
            
            const imageBuffer = await generateVerificationImage(member);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'dogrulandi.png' });

            const currentDateStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

            const logContainer = new ContainerBuilder()
              .setAccentColor(0xD4AF37) // Altın sarısı
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# [Doğrulama Log](https://discord.gg/castellancraft)')
              )
              .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                  new MediaGalleryItemBuilder()
                    .setURL('attachment://dogrulandi.png')
                    .setDescription('Doğrulama Detayları')
                )
              )
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('log_username')
                    .setLabel(member.user.username)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('log_discord_id')
                    .setLabel(member.user.id)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('log_date')
                    .setLabel(currentDateStr)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('log_mc_name')
                    .setLabel(mcAdi)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
                )
              );

            await logChannel.send({
              components: [logContainer],
              files: [attachment],
              flags: [MessageFlags.IsComponentsV2]
            });
          }
        }

      } catch (error) {
        console.error('Roller güncellenirken veya log atılırken hata oluştu:', error);
        
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: '⚠️ **Rol Güncelleme Hatası**\n\nDoğrulama bilgileriniz alınmış fakat rolleriniz güncellenirken sistemsel bir hata oluşmuştur. Lütfen sunucu yöneticisi ile iletişime geçiniz.'
          });
        } else {
          await interaction.reply({
            content: '⚠️ **Rol Güncelleme Hatası**\n\nDoğrulama bilgileriniz alınmış fakat rolleriniz güncellenirken sistemsel bir hata oluşmuştur. Lütfen sunucu yöneticisi ile iletişime geçiniz.',
            flags: [MessageFlags.Ephemeral]
          });
        }
      }
    }

    // 4. İSTEK / ÖNERİ MODAL SUBMIT
    else if (interaction.customId === 'suggestion_modal') {
      try {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const suggestionText = interaction.fields.getTextInputValue('suggestion_input');
        const db = loadDatabase();
        const logChannelId = db.settings?.suggestionLogChannelId;

        let logChannel;
        if (logChannelId) {
          logChannel = interaction.guild.channels.cache.get(logChannelId) || await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        }

        if (!logChannel) {
          return interaction.editReply({
            content: '⚠️ **Hata**\n\nİstek/Öneri günlük kanalı ayarlanmamış veya bulunamadı. Lütfen yöneticilere bildiriniz.'
          });
        }

        const dateStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const logContainer = new ContainerBuilder()
          .setAccentColor(0xD4AF37) // Altın sarısı
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# [İSTEK ÖNERİ BİLDİRİMİ](https://discord.gg/castellancraft)\n\n**Gönderen:** <@${interaction.user.id}>\n**Tarih:** ${dateStr}\n\n**İstek / Öneri:**\n${suggestionText}`)
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('log_suggestion_user')
                .setLabel(`Gönderen: ${interaction.user.username}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('log_suggestion_date')
                .setLabel(dateStr)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          );

        await logChannel.send({
          components: [logContainer],
          flags: [MessageFlags.IsComponentsV2]
        });

        await interaction.editReply({
          content: '✅ **Başarılı**\n\nİstek veya öneriniz başarıyla kaydedilmiş ve yetkililere iletilmiştir. Katkılarınız için teşekkür ederiz!'
        });

      } catch (error) {
        console.error('İstek öneri gönderilirken hata:', error);
        await interaction.editReply({
          content: '⚠️ **Hata**\n\nİstek veya öneriniz gönderilirken sistemsel bir hata oluştu.'
        });
      }
    }

    // 5. HATA BİLDİRİMİ MODAL SUBMIT
    else if (interaction.customId === 'bug_report_modal') {
      try {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const bugText = interaction.fields.getTextInputValue('bug_input');
        const db = loadDatabase();
        const logChannelId = db.settings?.bugReportLogChannelId;

        let logChannel;
        if (logChannelId) {
          logChannel = interaction.guild.channels.cache.get(logChannelId) || await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        }

        if (!logChannel) {
          return interaction.editReply({
            content: '⚠️ **Hata**\n\nHata bildirim günlük kanalı ayarlanmamış veya bulunamadı. Lütfen yöneticilere bildiriniz.'
          });
        }

        const dateStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const logContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C) // Kırmızı
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# [HATA BİLDİRİMİ](https://discord.gg/castellancraft)\n\n**Gönderen:** <@${interaction.user.id}>\n**Tarih:** ${dateStr}\n\n**Hata Detayı:**\n${bugText}`)
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('log_bug_user')
                .setLabel(`Gönderen: ${interaction.user.username}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('log_bug_date')
                .setLabel(dateStr)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          );

        await logChannel.send({
          components: [logContainer],
          flags: [MessageFlags.IsComponentsV2]
        });

        await interaction.editReply({
          content: '✅ **Başarılı**\n\nHata bildiriminiz başarıyla yetkililere iletilmiştir. Geri bildiriminiz için teşekkür ederiz!'
        });

      } catch (error) {
        console.error('Hata bildirimi gönderilirken hata:', error);
        await interaction.editReply({
          content: '⚠️ **Hata**\n\nHata bildiriminiz gönderilirken sistemsel bir hata oluştu.'
        });
      }
    }

    // 2. TALEBE ÜYE EKLEME MODAL SUBMIT
    else if (interaction.customId === 'ticket_add_member_modal') {
      const targetId = interaction.fields.getTextInputValue('member_id_input').trim();
      
      try {
        const guild = interaction.guild;
        const targetMember = await guild.members.fetch(targetId);

        if (!targetMember) {
          return interaction.reply({
            content: '⚠️ **Hata**\n\nBelirtilen kimliğe sahip kullanıcı sunucuda bulunamamıştır.',
            flags: [MessageFlags.Ephemeral]
          });
        }

        // Kanala üye erişim izni ekle
        await interaction.channel.permissionOverwrites.create(targetMember.id, {
          ViewChannel: true,
          SendMessages: true
        });

        await interaction.reply({
          content: `✅ **Başarılı**\n\n<@${targetMember.id}> kullanıcısı destek talebine başarıyla eklenmiştir.`
        });

      } catch (error) {
        console.error('Talebe üye ekleme hatası:', error);
        await interaction.reply({
          content: '⚠️ **Hata**\n\nKullanıcı eklenirken bir sorun oluşmuştur. Lütfen girilen ID değerinin doğruluğunu kontrol ediniz.',
          flags: [MessageFlags.Ephemeral]
        });
      }
    }

    // 3. TALEPTEN ÜYE ÇIKARMA MODAL SUBMIT
    else if (interaction.customId === 'ticket_remove_member_modal') {
      const targetId = interaction.fields.getTextInputValue('member_id_input').trim();

      try {
        const guild = interaction.guild;
        const targetMember = await guild.members.fetch(targetId);

        if (!targetMember) {
          return interaction.reply({
            content: '⚠️ **Hata**\n\nBelirtilen kimliğe sahip kullanıcı sunucuda bulunamamıştır.',
            flags: [MessageFlags.Ephemeral]
          });
        }

        // Kanaldan üyenin erişim overwrite'ını sil
        await interaction.channel.permissionOverwrites.delete(targetMember.id);

        await interaction.reply({
          content: `❌ **Başarılı**\n\n<@${targetMember.id}> kullanıcısı destek talebinden başarıyla çıkarılmıştır.`
        });

      } catch (error) {
        console.error('Talepten üye çıkarma hatası:', error);
        await interaction.reply({
          content: '⚠️ **Hata**\n\nKullanıcı çıkarılırken bir sorun oluşmuştur. Lütfen girilen ID değerinin doğruluğunu kontrol ediniz.',
          flags: [MessageFlags.Ephemeral]
        });
      }
    }
  }
});

// Mesaj Geçmişi İzleme Map (Spam Koruması İçin)
const msgHistory = new Map();

// Davet Linki Koruması, Otomatik Selam & Spam Koruması (Message Event Dinleyicisi)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // 1. Mizah Kanalı Otomatik Tepki (Haha) Kontrolü
  const db = loadDatabase();
  const jokeChannelId = db.settings?.jokeChannelId;
  if (jokeChannelId && message.channel.id === jokeChannelId) {
    try {
      await message.react('🤣');
    } catch (e) {
      console.error('Mizah kanalında otomatik tepki eklenirken hata:', e);
    }
  }

  // 2. Otomatik Selam Yanıtı (Tüm kanallarda ve tüm üyeler için geçerli)
  const cleanMsg = message.content.toLowerCase().trim();
  const greetingTriggers = ['sa', 'selam', 'selamun aleyküm', 'selamün aleyküm', 'selamlar', 'slm'];
  if (greetingTriggers.includes(cleanMsg)) {
    try {
      await message.reply('Aleykümselam');
    } catch (e) {
      console.error('Selam yanıtı gönderilirken hata oluştu:', e);
    }
    return;
  }

  // Muaf Kategori Kontrolü: 1521980856493932574 (Destek Talepleri)
  const isExemptChannel = 
    message.channel.parentId === '1521980856493932574' || 
    (message.channel.parent && message.channel.parent.id === '1521980856493932574');

  if (isExemptChannel) return;

  // Muaf Rol/Yönetici Kontrolü
  if (isStaff(message.member)) return;

  // 2. Spam Koruması Kontrolü (5 saniyede 5 mesaj)
  const now = Date.now();
  const userSpamKey = `${message.guild.id}-${message.author.id}`;
  if (!msgHistory.has(userSpamKey)) {
    msgHistory.set(userSpamKey, []);
  }

  const timestamps = msgHistory.get(userSpamKey);
  timestamps.push(now);

  // Sadece son 5 saniyedeki mesajları tut
  const recentTimestamps = timestamps.filter(time => now - time < 5000);
  msgHistory.set(userSpamKey, recentTimestamps);

  if (recentTimestamps.length > 5) {
    try {
      await message.delete();
      
      let muted = false;
      if (message.member.moderatable) {
        await message.member.timeout(60000, 'Sunucuda spam yapılması.');
        muted = true;
      }

      const warningText = muted 
        ? `⚠️ <@${message.author.id}>, aşırı hızlı mesaj gönderdiğiniz (spam) için 1 dakika süresince geçici olarak susturuldunuz.`
        : `⚠️ <@${message.author.id}>, aşırı hızlı mesaj gönderiyorsunuz (spam). Lütfen yavaşlayınız.`;

      const warnMsg = await message.channel.send({
        content: warningText
      });

      setTimeout(async () => {
        try {
          await warnMsg.delete();
        } catch (e) {}
      }, 10000);

    } catch (error) {
      console.error('Spam engelleme hatası:', error);
    }
    return;
  }

  // 3. Discord davet bağlantılarını tespit eden düzenli ifade
  const inviteRegex = /(discord\.(gg|io|me|li|com\/invite)\/[a-zA-Z0-9\-]+)/gi;
  if (!inviteRegex.test(message.content)) return;

  try {
    // İhlal eden mesajı sil
    await message.delete();

    // Resmi V2 uyarı kartı oluştur (Sade, görsel barındırmayan)
    const warningContainer = new ContainerBuilder()
      .setAccentColor(0xE74C3C) // Kırmızı uyarı rengi
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# [Bağlantı Engellendi](https://discord.gg/castellancraft)')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`⚠️ <@${message.author.id}>, bu sunucuda Discord davet bağlantısı paylaşılması yasaktır. Lütfen kurallara riayet ediniz.`)
      );

    // Uyarı mesajını kanala gönder
    const warnMsg = await message.channel.send({
      components: [warningContainer],
      flags: [MessageFlags.IsComponentsV2]
    });

    // Uyarı mesajını 15 saniye sonra kaldır
    setTimeout(async () => {
      try {
        await warnMsg.delete();
      } catch (e) {
        // Mesaj zaten el ile veya başka bir şekilde silinmiş olabilir
      }
    }, 15000);

  } catch (error) {
    console.error('Bağlantı koruma sistemi hatası:', error);
  }
});

// Otomatik Rol Verme & Giriş Mesajı (guildMemberAdd Event Dinleyicisi)
client.on('guildMemberAdd', async member => {
  const db = loadDatabase();
  
  // Üye veya kullanıcı kısmi (partial) ise tam veriyi çek
  if (member.partial) {
    try {
      await member.fetch();
    } catch (e) {
      console.error('Kısmi üye bilgisi çekilirken hata oluştu:', e);
    }
  }
  if (member.user && member.user.partial) {
    try {
      await member.user.fetch();
    } catch (e) {
      console.error('Kısmi kullanıcı bilgisi çekilirken hata oluştu:', e);
    }
  }

  // 1. Otomatik Rol Verme
  const autoRoleId = db.settings ? db.settings.autoRoleId : null;
  if (autoRoleId) {
    try {
      const role = member.guild.roles.cache.get(autoRoleId);
      if (role) {
        await member.roles.add(role);
        console.log(`[OTOMATİK ROL] ${member.user.tag} kullanıcısına ${role.name} rolü başarıyla verilmiştir.`);
      }
    } catch (error) {
      console.error('Otomatik rol verilirken hata oluştu:', error);
    }
  }

  // 2. Giriş Mesajı Gönderme
  const welcomeChannelId = db.settings ? db.settings.welcomeChannelId : null;
  if (welcomeChannelId) {
    let channel = member.guild.channels.cache.get(welcomeChannelId);
    if (!channel) {
      try {
        channel = await member.guild.channels.fetch(welcomeChannelId);
      } catch (err) {
        console.error('Giriş kanalı fetch edilirken hata oluştu:', err);
      }
    }
    
    if (channel) {
      try {
        const imageBuffer = await generateWelcomeImage(member, true);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'hosgeldi.png' });

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const createdAtStr = member.user.createdAt ? member.user.createdAt.toLocaleDateString('tr-TR', options) : 'Bilinmiyor';

        const welcomeContainer = new ContainerBuilder()
          .setAccentColor(0x2ECC71) // Giriş için Yeşil
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# [${member.guild.name} - Giriş](https://discord.gg/castellancraft)`)
          )
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder()
                .setURL('attachment://hosgeldi.png')
                .setDescription('Giriş Detayları')
            )
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('welcome_username')
                .setLabel(`@${member.user.username}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('welcome_created')
                .setLabel(createdAtStr)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          );

        await channel.send({
          components: [welcomeContainer],
          files: [attachment],
          flags: [MessageFlags.IsComponentsV2]
        });
      } catch (error) {
        console.error('Giriş mesajı gönderilirken hata oluştu:', error);
      }
    }
  }
});

// Çıkış Mesajı Gönderme (guildMemberRemove Event Dinleyicisi)
client.on('guildMemberRemove', async member => {
  const db = loadDatabase();
  
  // Üye veya kullanıcı kısmi (partial) ise tam veriyi çek
  if (member.partial) {
    try {
      await member.fetch();
    } catch (e) {
      // Ayrılan kişi sunucudan çıktığı için GuildMember fetch edilemeyebilir, hata yok sayılır.
    }
  }
  if (member.user && member.user.partial) {
    try {
      await member.user.fetch();
    } catch (e) {
      console.error('Kısmi kullanıcı bilgisi çekilirken hata oluştu:', e);
    }
  }

  const welcomeChannelId = db.settings ? db.settings.welcomeChannelId : null;
  if (!welcomeChannelId) return;

  let channel = member.guild.channels.cache.get(welcomeChannelId);
  if (!channel) {
    try {
      channel = await member.guild.channels.fetch(welcomeChannelId);
    } catch (err) {
      console.error('Çıkış kanalı fetch edilirken hata oluştu:', err);
    }
  }

  if (channel) {
    try {
      const imageBuffer = await generateWelcomeImage(member, false);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'ayrildi.png' });

      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const createdAtStr = member.user.createdAt ? member.user.createdAt.toLocaleDateString('tr-TR', options) : 'Bilinmiyor';

      const leaveContainer = new ContainerBuilder()
        .setAccentColor(0xE74C3C) // Ayrılış için Kırmızı
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# [${member.guild.name} - Ayrılış](https://discord.gg/castellancraft)`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL('attachment://ayrildi.png')
              .setDescription('Ayrılış Detayları')
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('leave_username')
              .setLabel(`@${member.user.username}`)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('leave_created')
              .setLabel(createdAtStr)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          )
        );

      await channel.send({
        components: [leaveContainer],
        files: [attachment],
        flags: [MessageFlags.IsComponentsV2]
      });
    } catch (error) {
      console.error('Çıkış mesajı gönderilirken hata oluştu:', error);
    }
  }
});

// Yeni Kanal Oluşturulduğunda Harici Uygulamaları Engelle (channelCreate Event Dinleyicisi)
client.on('channelCreate', async channel => {
  if (!channel.guild) return;
  const everyoneRole = channel.guild.roles.everyone;
  try {
    await channel.permissionOverwrites.edit(everyoneRole, {
      UseExternalApps: false
    });
    console.log(`[HARİCİ UYGULAMA ENGELİ] Yeni oluşturulan #${channel.name} kanalında harici uygulamalar engellendi.`);
  } catch (err) {
    console.error(`Yeni kanalda harici uygulama engellenirken hata oluştu (#${channel.name}):`, err);
  }
});

// Railway veya diğer barındırma hizmetlerinde port bağlama (Web Service) gereksinimi için dummy HTTP sunucusu
if (process.env.PORT) {
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('CastellanCraft Bot Çalışıyor!');
  });
  
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`[RAILWAY] Dummy HTTP sunucusu ${port} portunda başlatıldı.`);
  });
}

// Botu başlat
client.login(config.token);
