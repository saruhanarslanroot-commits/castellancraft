const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

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

// database.json dosyasını kaydet
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

// Yasaklama Canvas Görsel Oluşturucu
async function generateBanImage(user, reason) {
  const canvas = createCanvas(900, 450);
  const ctx = canvas.getContext('2d');

  // Banner Görselini Yükle
  let bannerImg;
  try {
    bannerImg = await loadImage(path.join(__dirname, 'banner.png'));
  } catch (error) {
    console.error('Banner resmi yüklenemedi:', error);
  }

  // Yuvarlatılmış Kart Alanı Kırpması
  ctx.save();
  const x = 10, y = 10, width = 880, height = 430, radius = 25;
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
  ctx.clip();

  // Banner'ı arka plana çiz
  if (bannerImg) {
    ctx.drawImage(bannerImg, 10, 10, 880, 430);
  } else {
    ctx.fillStyle = '#0c0f0d';
    ctx.fillRect(10, 10, 880, 430);
  }

  // Karartma (Overlay) - Görselin üzerine %94 siyah katman çiz
  ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
  ctx.fillRect(10, 10, 880, 430);
  ctx.restore();

  // Arka Plan Çerçevesi (Kırmızı)
  drawRoundedRect(ctx, 10, 10, 880, 430, 25, false, true, '#991b1b', 4);

  // Koyu Kırmızı Radial Işıma (Glow) efekti (Avatar arkasında)
  const glowGrad = ctx.createRadialGradient(160, 225, 50, 160, 225, 200);
  glowGrad.addColorStop(0, 'rgba(153, 27, 27, 0.2)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(10, 10, 880, 430);

  // Köşe Dekorasyon Parantezleri (Kırmızı)
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 4;
  
  // Sol Üst
  ctx.beginPath();
  ctx.moveTo(25, 50);
  ctx.lineTo(25, 25);
  ctx.lineTo(50, 25);
  ctx.stroke();

  // Sağ Üst
  ctx.beginPath();
  ctx.moveTo(875, 50);
  ctx.lineTo(875, 25);
  ctx.lineTo(850, 25);
  ctx.stroke();

  // Sol Alt
  ctx.beginPath();
  ctx.moveTo(25, 400);
  ctx.lineTo(25, 425);
  ctx.lineTo(50, 425);
  ctx.stroke();

  // Sağ Alt
  ctx.beginPath();
  ctx.moveTo(875, 400);
  ctx.lineTo(875, 425);
  ctx.lineTo(850, 425);
  ctx.stroke();

  // Kullanıcı Avatarını Yükle
  let avatarImg;
  try {
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
    avatarImg = await loadImage(avatarURL);
  } catch (error) {
    console.error('Avatar resmi yüklenemedi:', error);
  }

  // Avatarı dairesel olarak çiz
  ctx.save();
  ctx.beginPath();
  ctx.arc(160, 225, 100, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, 60, 125, 200, 200);
  } else {
    ctx.fillStyle = '#555555';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(user.username ? user.username.charAt(0).toUpperCase() : 'U', 160, 255);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // Avatar Kenarlığı (Kırmızı)
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(160, 225, 100, 0, Math.PI * 2, true);
  ctx.stroke();

  // Başlık Alanı
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('BAN', 320, 85);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 55px sans-serif';
  ctx.fillText('YASAKLANDI', 320, 145);

  // İnce Yatay Çizgi
  ctx.strokeStyle = '#2b0f0f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(320, 170);
  ctx.lineTo(840, 170);
  ctx.stroke();

  // Kutu 1 (BAN YİYEN)
  drawRoundedRect(ctx, 320, 200, 240, 90, 12, '#140707', true, '#2b0f0f', 2);
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('BAN YİYEN', 340, 227);
  
  ctx.fillStyle = '#ffffff';
  let nameSize = 22;
  ctx.font = `bold ${nameSize}px sans-serif`;
  while (ctx.measureText(user.username).width > 200 && nameSize > 14) {
    nameSize -= 2;
    ctx.font = `bold ${nameSize}px sans-serif`;
  }
  ctx.fillText(user.username, 340, 267);

  // Kutu 2 (SEBEP)
  drawRoundedRect(ctx, 580, 200, 260, 90, 12, '#140707', true, '#2b0f0f', 2);
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('SEBEP', 600, 227);
  
  ctx.fillStyle = '#ffffff';
  let reasonSize = 20;
  ctx.font = `bold ${reasonSize}px sans-serif`;
  while (ctx.measureText(reason).width > 220 && reasonSize > 12) {
    reasonSize -= 2;
    ctx.font = `bold ${reasonSize}px sans-serif`;
  }
  ctx.fillText(reason, 600, 267);

  // Kutu 3 (BAN TARİHİ)
  drawRoundedRect(ctx, 320, 310, 520, 90, 12, '#140707', true, '#2b0f0f', 2);
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('BAN TARİHİ', 340, 337);
  
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const dateStr = new Date().toLocaleDateString('tr-TR', options);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(dateStr, 340, 377);

  // Sağ Alt Köşe Metni
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('BAN', 810, 425);

  return canvas.toBuffer('image/png');
}

// Atılma Canvas Görsel Oluşturucu
async function generateKickImage(user, reason) {
  const canvas = createCanvas(900, 450);
  const ctx = canvas.getContext('2d');

  // Banner Görselini Yükle (Yasaklama bannerını karartarak arka plan dokusu olarak kullanıyoruz)
  let bannerImg;
  try {
    bannerImg = await loadImage(path.join(__dirname, 'banner.png'));
  } catch (error) {
    console.error('Banner resmi yüklenemedi:', error);
  }

  // Yuvarlatılmış Kart Alanı Kırpması
  ctx.save();
  const x = 10, y = 10, width = 880, height = 430, radius = 25;
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
  ctx.clip();

  // Banner'ı çiz
  if (bannerImg) {
    ctx.drawImage(bannerImg, 10, 10, 880, 430);
  } else {
    ctx.fillStyle = '#0c0f0d';
    ctx.fillRect(10, 10, 880, 430);
  }

  // Karartma (Overlay) - Görselin üzerine %94 siyah katman çiz
  ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
  ctx.fillRect(10, 10, 880, 430);
  ctx.restore();

  // Arka Plan Çerçevesi (Turuncu)
  drawRoundedRect(ctx, 10, 10, 880, 430, 25, false, true, '#d35400', 4);

  // Koyu Turuncu Radial Işıma (Glow) efekti (Avatar arkasında)
  const glowGrad = ctx.createRadialGradient(160, 225, 50, 160, 225, 200);
  glowGrad.addColorStop(0, 'rgba(230, 126, 34, 0.15)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(10, 10, 880, 430);

  // Köşe Dekorasyon Parantezleri (Turuncu)
  ctx.strokeStyle = '#d35400';
  ctx.lineWidth = 4;
  
  // Sol Üst
  ctx.beginPath();
  ctx.moveTo(25, 50);
  ctx.lineTo(25, 25);
  ctx.lineTo(50, 25);
  ctx.stroke();

  // Sağ Üst
  ctx.beginPath();
  ctx.moveTo(875, 50);
  ctx.lineTo(875, 25);
  ctx.lineTo(850, 25);
  ctx.stroke();

  // Sol Alt
  ctx.beginPath();
  ctx.moveTo(25, 400);
  ctx.lineTo(25, 425);
  ctx.lineTo(50, 425);
  ctx.stroke();

  // Sağ Alt
  ctx.beginPath();
  ctx.moveTo(875, 400);
  ctx.lineTo(875, 425);
  ctx.lineTo(850, 425);
  ctx.stroke();

  // Kullanıcı Avatarını Yükle
  let avatarImg;
  try {
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
    avatarImg = await loadImage(avatarURL);
  } catch (error) {
    console.error('Avatar resmi yüklenemedi:', error);
  }

  // Avatarı dairesel olarak çiz
  ctx.save();
  ctx.beginPath();
  ctx.arc(160, 225, 100, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, 60, 125, 200, 200);
  } else {
    ctx.fillStyle = '#555555';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(user.username ? user.username.charAt(0).toUpperCase() : 'U', 160, 255);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // Avatar Kenarlığı (Turuncu)
  ctx.strokeStyle = '#d35400';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(160, 225, 100, 0, Math.PI * 2, true);
  ctx.stroke();

  // Başlık Alanı
  ctx.fillStyle = '#d35400';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('KICK', 320, 85);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 55px sans-serif';
  ctx.fillText('ATILDI', 320, 145);

  // İnce Yatay Çizgi
  ctx.strokeStyle = '#2b160a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(320, 170);
  ctx.lineTo(840, 170);
  ctx.stroke();

  // Kutu 1 (ATILAN)
  drawRoundedRect(ctx, 320, 200, 240, 90, 12, '#140c07', true, '#2b160a', 2);
  ctx.fillStyle = '#d35400';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('ATILAN', 340, 227);
  
  ctx.fillStyle = '#ffffff';
  let nameSize = 22;
  ctx.font = `bold ${nameSize}px sans-serif`;
  while (ctx.measureText(user.username).width > 200 && nameSize > 14) {
    nameSize -= 2;
    ctx.font = `bold ${nameSize}px sans-serif`;
  }
  ctx.fillText(user.username, 340, 267);

  // Kutu 2 (SEBEP)
  drawRoundedRect(ctx, 580, 200, 260, 90, 12, '#140c07', true, '#2b160a', 2);
  ctx.fillStyle = '#d35400';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('SEBEP', 600, 227);
  
  ctx.fillStyle = '#ffffff';
  let reasonSize = 20;
  ctx.font = `bold ${reasonSize}px sans-serif`;
  while (ctx.measureText(reason).width > 220 && reasonSize > 12) {
    reasonSize -= 2;
    ctx.font = `bold ${reasonSize}px sans-serif`;
  }
  ctx.fillText(reason, 600, 267);

  // Kutu 3 (ATILMA TARİHİ)
  drawRoundedRect(ctx, 320, 310, 520, 90, 12, '#140c07', true, '#2b160a', 2);
  ctx.fillStyle = '#d35400';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('ATILMA TARİHİ', 340, 337);
  
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const dateStr = new Date().toLocaleDateString('tr-TR', options);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(dateStr, 340, 377);

  // Sağ Alt Köşe Metni
  ctx.fillStyle = '#d35400';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('KICK', 810, 425);

  return canvas.toBuffer('image/png');
}

const AUTHORIZED_USER_ID = '578816597054193664';

const commands = {
  'doğrulama-kur': {
    data: new SlashCommandBuilder()
      .setName('doğrulama-kur')
      .setDescription('Sunucu için doğrulama panelini kurar.'),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# [Doğrulama Sistemi](https://discord.gg/castellancraft)')
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL('https://resmim.net/cdn/2026/07/01/Ccr8iy.png')
              .setDescription('CastellanCraft Doğrulama Görseli')
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Hesabınızı doğrulayarak Castellan Craft topluluğunun bir parçası olabilirsiniz.\n\nDoğrulama işlemini tamamladıktan sonra tüm kanallara erişebilir, diğer oyuncularla tanışabilir ve maceranıza hemen başlayabilirsiniz. İyi eğlenceler! 🌟')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('brand_button')
              .setLabel('@castellancraft')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('verify_user')
              .setLabel('Doğrula')
              .setStyle(ButtonStyle.Success)
          )
        );

      await interaction.channel.send({
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });

      await interaction.reply({
        content: '✅ Doğrulama paneli kanala başarıyla kurulmuştur. İşleminiz diğer kullanıcılardan gizlenmiştir.',
        flags: [MessageFlags.Ephemeral]
      });
    }
  },

  'doğrulama-log': {
    data: new SlashCommandBuilder()
      .setName('doğrulama-log')
      .setDescription('Doğrulama günlüklerinin gönderileceği kanalı ayarlar.'),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const channel = interaction.options.getChannel('kanal');
      
      if (!channel.isTextBased()) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Hata**\n\nLütfen geçerli bir metin kanalı seçiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const db = loadDatabase();
      if (!db.settings) db.settings = {};
      db.settings.logChannelId = channel.id;
      saveDatabase(db);

      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Başarılı!**\n\nDoğrulama günlük kanalı başarıyla <#${channel.id}> olarak ayarlanmıştır.`)
        );

      await interaction.reply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },

  'destek-talebi-kur': {
    data: new SlashCommandBuilder()
      .setName('destek-talebi-kur')
      .setDescription('Sunucu için destek talebi panelini kurar.'),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const container = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# [Destek Talebi](https://discord.gg/castellancraft)')
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL('https://resmim.net/cdn/2026/07/02/CcrQWT.png')
              .setDescription('CastellanCraft Destek Görseli')
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Destek ekibimizle iletişime geçmek ve yardım almak için lütfen aşağıdaki **Destek Talebi** butonuna tıklayınız.')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('brand_button_destek')
              .setLabel('@castellancraft')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('create_ticket')
              .setLabel('Destek Talebi')
              .setStyle(ButtonStyle.Success)
          )
        );

      await interaction.channel.send({
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });

      await interaction.reply({
        content: '✅ Destek talebi paneli kanala başarıyla kurulmuştur. İşleminiz diğer kullanıcılardan gizlenmiştir.',
        flags: [MessageFlags.Ephemeral]
      });
    }
  },

  'destek-transcript': {
    data: new SlashCommandBuilder()
      .setName('destek-transcript')
      .setDescription('Destek görüşme kayıtlarının gönderileceği kanalı ayarlar.')
      .addChannelOption(option =>
        option
          .setName('kanal')
          .setDescription('Logların gönderileceği metin kanalı')
          .setRequired(true)
      ),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const channel = interaction.options.getChannel('kanal');
      
      if (!channel.isTextBased()) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Hata**\n\nLütfen geçerli bir metin kanalı seçiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const db = loadDatabase();
      if (!db.settings) db.settings = {};
      db.settings.transcriptChannelId = channel.id;
      saveDatabase(db);

      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Başarılı!**\n\nDestek görüşme kayıt kanalı başarıyla <#${channel.id}> olarak ayarlanmıştır.`)
        );

      await interaction.reply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },

  'otomatik-rol-kur': {
    data: new SlashCommandBuilder()
      .setName('otomatik-rol-kur')
      .setDescription('Sunucuya katılan yeni üyelere otomatik olarak verilecek rolü ayarlar.')
      .addRoleOption(option =>
        option
          .setName('rol')
          .setDescription('Otomatik verilecek rol')
          .setRequired(true)
      ),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const role = interaction.options.getRole('rol');

      const db = loadDatabase();
      if (!db.settings) db.settings = {};
      db.settings.autoRoleId = role.id;
      saveDatabase(db);

      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Başarılı**\n\nYeni katılan üyelere verilecek otomatik rol başarıyla <@&${role.id}> olarak belirlenmiştir.`)
        );

      await interaction.reply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },

  'hoşgeldin-kur': {
    data: new SlashCommandBuilder()
      .setName('hoşgeldin-kur')
      .setDescription('Giriş ve çıkış mesajlarının gönderileceği kanalı ayarlar.')
      .addChannelOption(option =>
        option
          .setName('kanal')
          .setDescription('Mesajların gönderileceği metin kanalı')
          .setRequired(true)
      ),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const channel = interaction.options.getChannel('kanal');
      
      if (!channel.isTextBased()) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Hata**\n\nLütfen geçerli bir metin kanalı seçiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const db = loadDatabase();
      if (!db.settings) db.settings = {};
      db.settings.welcomeChannelId = channel.id;
      saveDatabase(db);

      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Başarılı**\n\nGiriş ve çıkış bildirim kanalı başarıyla <#${channel.id}> olarak belirlenmiştir.`)
        );

      await interaction.reply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2]
      });
    }
  },

  'yasakla': {
    data: new SlashCommandBuilder()
      .setName('yasakla')
      .setDescription('Belirtilen kullanıcıyı sunucudan yasaklar.')
      .addUserOption(option =>
        option
          .setName('kullanıcı')
          .setDescription('Yasaklanacak kullanıcı veya ID')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('sebep')
          .setDescription('Yasaklama sebebi')
          .setRequired(true)
      ),
    async execute(interaction) {
      // Yetki kontrolü (Yasaklama yetkisi veya Yönetici yetkisi olmalı)
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için kullanıcıları yasaklama yetkisine sahip olmalısınız.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const targetUser = interaction.options.getUser('kullanıcı');
      const reason = interaction.options.getString('sebep');

      // İşlemler uzun sürebileceği için (Canvas çizimi ve API istekleri) etkileşimi defer ediyoruz.
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

      // Kullanıcıyı sunucudan yasakla (Denetim Kaydı/Audit Log için detaylı sebep)
      const optionsStr = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
      const auditDateStr = new Date().toLocaleDateString('tr-TR', optionsStr);
      const auditReason = `Yasaklayan: ${interaction.user.username} | Tarih: ${auditDateStr} | Sebep: ${reason}`;

      try {
        await interaction.guild.members.ban(targetUser.id, { reason: auditReason });
      } catch (err) {
        console.error('Yasaklama hatası:', err);
        return interaction.editReply({
          content: '⚠️ **Yasaklama Hatası**\n\nBelirtilen kullanıcı yasaklanırken bir hata oluştu. Botun rol hiyerarşisinde üstte olduğundan ve "Üyeleri Yasakla" yetkisine sahip olduğundan emin olunuz.'
        });
      }

      // Log gönderme kanalı: 1522001562308706405
      const logChannelId = '1522001562308706405';
      let logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (!logChannel) {
        try {
          logChannel = await interaction.guild.channels.fetch(logChannelId);
        } catch (e) {
          console.error('Yasaklama log kanalı bulunamadı:', e);
        }
      }

      if (logChannel) {
        try {
          const imageBuffer = await generateBanImage(targetUser, reason);
          const attachment = new AttachmentBuilder(imageBuffer, { name: 'yasaklandi.png' });

          const banContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000) // Saf Kırmızı
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`# [YENI YASAKLANMA](https://discord.gg/castellancraft)\n\n**Yasaklanan Kullanıcı:** <@${targetUser.id}>`)
            )
            .addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                  .setURL('attachment://yasaklandi.png')
                  .setDescription('Yasaklama Detayları')
              )
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('brand_ban_logo')
                  .setLabel('@castellancraft')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true)
              )
            );

          await logChannel.send({
            components: [banContainer],
            files: [attachment],
            flags: [MessageFlags.IsComponentsV2]
          });
        } catch (error) {
          console.error('Yasaklama logu gönderilirken hata:', error);
        }
      }

      await interaction.editReply({
        content: `✅ **Kullanıcı Yasaklandı**\n\n<@${targetUser.id}> kullanıcısı sunucudan başarıyla yasaklanmıştır ve günlük kanala kaydedilmiştir.`
      });
    }
  },

  'sunucudan-at': {
    data: new SlashCommandBuilder()
      .setName('sunucudan-at')
      .setDescription('Belirtilen kullanıcıyı sunucudan atar.')
      .addUserOption(option =>
        option
          .setName('kullanıcı')
          .setDescription('Atılacak kullanıcı veya ID')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('sebep')
          .setDescription('Atılma sebebi')
          .setRequired(true)
      ),
    async execute(interaction) {
      // Yetki kontrolü (Üyeleri Atma yetkisi veya Yönetici yetkisi olmalı)
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için kullanıcıları atma yetkisine sahip olmalısınız.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const targetUser = interaction.options.getUser('kullanıcı');
      const reason = interaction.options.getString('sebep');

      // Üyenin sunucuda bulunup bulunmadığını kontrol et
      const targetMember = interaction.options.getMember('kullanıcı');
      if (!targetMember) {
        return interaction.reply({
          content: '⚠️ **Atma Hatası**\n\nBelirtilen kullanıcı sunucuda bulunamadı veya zaten ayrılmış.',
          flags: [MessageFlags.Ephemeral]
        });
      }

      // İşlemler uzun sürebileceği için etkileşimi defer ediyoruz.
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

      // Kullanıcıyı sunucudan at (Denetim Kaydı/Audit Log için detaylı sebep)
      const optionsStr = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
      const auditDateStr = new Date().toLocaleDateString('tr-TR', optionsStr);
      const auditReason = `Atan: ${interaction.user.username} | Tarih: ${auditDateStr} | Sebep: ${reason}`;

      try {
        await targetMember.kick(auditReason);
      } catch (err) {
        console.error('Atma hatası:', err);
        return interaction.editReply({
          content: '⚠️ **Atma Hatası**\n\nBelirtilen kullanıcı sunucudan atılırken bir hata oluştu. Botun rol hiyerarşisinde üstte olduğundan ve "Üyeleri At" yetkisine sahip olduğundan emin olunuz.'
        });
      }

      // Log gönderme kanalı: 1522001562308706405
      const logChannelId = '1522001562308706405';
      let logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (!logChannel) {
        try {
          logChannel = await interaction.guild.channels.fetch(logChannelId);
        } catch (e) {
          console.error('Yasaklama log kanalı bulunamadı:', e);
        }
      }

      if (logChannel) {
        try {
          const imageBuffer = await generateKickImage(targetUser, reason);
          const attachment = new AttachmentBuilder(imageBuffer, { name: 'atildi.png' });

          const kickContainer = new ContainerBuilder()
            .setAccentColor(0xE67E22) // Turuncu
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`# [YENİ ATILMA](https://discord.gg/castellancraft)\n\n**Atılan Kullanıcı:** <@${targetUser.id}>`)
            )
            .addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder()
                  .setURL('attachment://atildi.png')
                  .setDescription('Atılma Detayları')
              )
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('brand_kick_logo')
                  .setLabel('@castellancraft')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true)
              )
            );

          await logChannel.send({
            components: [kickContainer],
            files: [attachment],
            flags: [MessageFlags.IsComponentsV2]
          });
        } catch (error) {
          console.error('Atılma logu gönderilirken hata:', error);
        }
      }

      await interaction.editReply({
        content: `✅ **Kullanıcı Atıldı**\n\n<@${targetUser.id}> kullanıcısı sunucudan başarıyla atılmıştır ve günlük kanala kaydedilmiştir.`
      });
    }
  },

  'patlat': {
    data: new SlashCommandBuilder()
      .setName('patlat')
      .setDescription('Kullanılan kanalı silerek aynı isim, izinler, kategori ve sırasıyla yeniden açar.'),
    async execute(interaction) {
      // Sadece 578816597054193664 kullanabilir
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const channel = interaction.channel;
      if (!channel) return;

      const name = channel.name;
      const type = channel.type;
      const parent = channel.parent;
      const position = channel.rawPosition;
      const topic = channel.topic;
      const nsfw = channel.nsfw;
      const rateLimit = channel.rateLimitPerUser;

      // İzinleri (permissionOverwrites) kopyala
      const overwrites = channel.permissionOverwrites.cache.map(o => ({
        id: o.id,
        type: o.type,
        allow: o.allow,
        deny: o.deny
      }));

      try {
        // Yeni kanalı oluştur (Aynı isim, kategori, izinler ve sırasıyla)
        const newChannel = await channel.guild.channels.create({
          name: name,
          type: type,
          parent: parent ? parent.id : null,
          topic: topic,
          nsfw: nsfw,
          rateLimitPerUser: rateLimit,
          permissionOverwrites: overwrites,
          position: position
        });

        // Eski kanalı sil
        await channel.delete('Kanal patlatma komutu.');

        const nukeContainer = new ContainerBuilder()
          .setAccentColor(0xFF0000) // Saf Kırmızı
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('💥 **Kanal Başarıyla Patlatıldı!**\n\nBu kanal silinerek tüm izinleri, kategorisi ve sırası korunacak şekilde yeniden oluşturulmuştur.')
          );

        // Yeni kanala patlatma onay mesajını V2 Container olarak gönder
        await newChannel.send({
          components: [nukeContainer],
          flags: [MessageFlags.IsComponentsV2]
        });

      } catch (error) {
        console.error('Kanal patlatılırken hata oluştu:', error);
        // Hata durumunda kanalı silmediysek bilgilendir
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '⚠️ **Hata**\n\nKanal patlatılırken sistemsel bir hata oluştu. Lütfen botun gerekli yetkilere sahip olduğunu kontrol ediniz.',
              flags: [MessageFlags.Ephemeral]
            });
          }
        } catch (e) {}
      }
    }
  },

  'mizah-kur': {
    data: new SlashCommandBuilder()
      .setName('mizah-kur')
      .setDescription('Seçilen kanalı mizah kanalı olarak ayarlar ve gönderilen her mesaja gülme tepkisi ekler.')
      .addChannelOption(option =>
        option
          .setName('kanal')
          .setDescription('Mizah kanalı olarak belirlenecek kanal')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      ),
    async execute(interaction) {
      // Sadece 578816597054193664 kullanabilir
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const jokeChannel = interaction.options.getChannel('kanal');

      const db = loadDatabase();
      if (!db.settings) db.settings = {};
      db.settings.jokeChannelId = jokeChannel.id;
      saveDatabase(db);

      await interaction.reply({
        content: `✅ **Mizah Kanalı Ayarlandı**\n\nMizah kanalı başarıyla <#${jokeChannel.id}> olarak belirlenmiştir. Bu kanala gönderilen mesajlara otomatik olarak gülme tepkisi eklenecektir.`,
        flags: [MessageFlags.Ephemeral]
      });
    }
  },

  'istek-öneri-kur': {
    data: new SlashCommandBuilder()
      .setName('istek-öneri-kur')
      .setDescription('İstek ve öneri gönderme panelini kurar.')
      .addChannelOption(option =>
        option
          .setName('panel-kanalı')
          .setDescription('Panelin kurulacağı metin kanalı')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption(option =>
        option
          .setName('log-kanalı')
          .setDescription('Gelen istek/önerilerin yönlendirileceği günlük kanalı')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      ),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const panelChannel = interaction.options.getChannel('panel-kanalı');
      const logChannel = interaction.options.getChannel('log-kanalı');

      const db = loadDatabase();
      if (!db.settings) db.settings = {};
      db.settings.suggestionPanelChannelId = panelChannel.id;
      db.settings.suggestionLogChannelId = logChannel.id;
      saveDatabase(db);

      const panelContainer = new ContainerBuilder()
        .setAccentColor(0xD4AF37) // Altın sarısı
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# [ISTEK ONERI](https://discord.gg/castellancraft)')
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL('https://resmim.net/cdn/2026/07/02/Cc0sTC.png')
              .setDescription('İstek Öneri Görseli')
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('brand_suggestion_btn')
              .setLabel('@castellancraft')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('send_suggestion')
              .setLabel('İstek/Öneri Gönder')
              .setStyle(ButtonStyle.Primary)
          )
        );

      await panelChannel.send({
        components: [panelContainer],
        flags: [MessageFlags.IsComponentsV2]
      });

      await interaction.reply({
        content: `✅ **İstek Öneri Paneli Kuruldu**\n\nPanel başarıyla <#${panelChannel.id}> kanalına gönderildi. Log kanalı ise <#${logChannel.id}> olarak kaydedildi.`,
        flags: [MessageFlags.Ephemeral]
      });
    }
  },

  'hata-bildir-kur': {
    data: new SlashCommandBuilder()
      .setName('hata-bildir-kur')
      .setDescription('Hata bildirim panelini kurar.')
      .addChannelOption(option =>
        option
          .setName('panel-kanalı')
          .setDescription('Panelin kurulacağı metin kanalı')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption(option =>
        option
          .setName('log-kanalı')
          .setDescription('Gelen hata bildirimlerinin yönlendirileceği günlük kanalı')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      ),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      const panelChannel = interaction.options.getChannel('panel-kanalı');
      const logChannel = interaction.options.getChannel('log-kanalı');

      const db = loadDatabase();
      if (!db.settings) db.settings = {};
      db.settings.bugReportPanelChannelId = panelChannel.id;
      db.settings.bugReportLogChannelId = logChannel.id;
      saveDatabase(db);

      const panelContainer = new ContainerBuilder()
        .setAccentColor(0xE74C3C) // Kırmızı
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# [HATA BILDIR](https://discord.gg/castellancraft)')
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL('https://resmim.net/cdn/2026/07/02/Cc0rUx.png')
              .setDescription('Hata Bildir Görseli')
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('brand_bug_btn')
              .setLabel('@castellancraft')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('send_bug_report')
              .setLabel('Hata Bildir')
              .setStyle(ButtonStyle.Danger)
          )
        );

      await panelChannel.send({
        components: [panelContainer],
        flags: [MessageFlags.IsComponentsV2]
      });

      await interaction.reply({
        content: `✅ **Hata Bildirim Paneli Kuruldu**\n\nPanel başarıyla <#${panelChannel.id}> kanalına gönderildi. Log kanalı ise <#${logChannel.id}> olarak kaydedildi.`,
        flags: [MessageFlags.Ephemeral]
      });
    }
  },

  'takma-ad-reset': {
    data: new SlashCommandBuilder()
      .setName('takma-ad-reset')
      .setDescription('Tüm sunucu üyelerinin değiştirilmiş takma adlarını yavaşça sıfırlar.'),
    async execute(interaction) {
      if (interaction.user.id !== AUTHORIZED_USER_ID) {
        const errContainer = new ContainerBuilder()
          .setAccentColor(0xE74C3C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('⚠️ **Yetki Hatası**\n\nBu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')
          );
        return interaction.reply({
          components: [errContainer],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
      }

      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

      const guild = interaction.guild;
      if (!guild) {
        return interaction.editReply({ content: '⚠️ Bu komut sadece sunucularda kullanılabilir.' });
      }

      try {
        const members = await guild.members.fetch();
        const targets = members.filter(m => m.nickname !== null && m.manageable);

        if (targets.size === 0) {
          return interaction.editReply({ content: '✅ Sunucuda takma adı sıfırlanabilecek (ve botun yetkisinin yettiği) kimse bulunamadı.' });
        }

        await interaction.editReply({ content: `⏳ Toplam ${targets.size} üyenin takma adı sıfırlanıyor. Bu işlem biraz zaman alabilir...` });

        let resetCount = 0;
        let errorCount = 0;

        for (const [id, member] of targets) {
          try {
            await member.setNickname(null, 'Takma ad sıfırlama komutu.');
            resetCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (err) {
            console.error(`${member.user.tag} takma adı sıfırlanırken hata oluştu:`, err);
            errorCount++;
          }
        }

        await interaction.editReply({ 
          content: `✅ **Takma Ad Sıfırlama Tamamlandı!**\n\nBaşarıyla sıfırlanan: **${resetCount}**\nHata oluşan: **${errorCount}**` 
        });

      } catch (error) {
        console.error('Takma ad sıfırlama işlemi sırasında genel hata:', error);
        await interaction.editReply({ content: '⚠️ Takma ad sıfırlama işlemi sırasında sistemsel bir hata oluştu.' });
      }
    }
  }
};

module.exports = {
  commands,
  loadDatabase,
  saveDatabase
};
