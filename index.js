require('dotenv').config();
const { Telegraf } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');

// ==========================================
// 1. SETUP SERVER EXPRESS (UNTUK RAILWAY)
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server Bot Telegram AI Jalan!');
});

app.listen(port, () => {
  console.log(`Server web port ${port}`);
});

// ==========================================
// 2. INISIALISASI BOT & GOOGLE AI
// ==========================================
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 3. COMMAND START
// ==========================================
bot.start((ctx) => {
  ctx.reply('Halo! Ketik /gambar [ide singkat]. Aku akan meracik ceritanya dan membuatkan gambar HD untukmu!');
});

// ==========================================
// 4. COMMAND GAMBAR (Logika Utama)
// ==========================================
// PERHATIKAN: Kata "async" wajib ada di depan (ctx)
bot.command('gambar', async (ctx) => {
  const userPrompt = ctx.message.text.split(' ').slice(1).join(' ');

  if (!userPrompt) {
    return ctx.reply('Tolong kasih ide singkatnya! Contoh: /gambar pisang kemakan tikus');
  }

  // Kirim pesan status awal
  const statusMsg = await ctx.reply('⏳ 1/2: Meminta Gemini meracik ide ceritamu menjadi prompt epik...');

  try {
    // --- TAHAP 1: GEMINI TEXT MEMBUAT PROMPT CERITA ---
    const chatResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: `Kamu adalah ahli prompt pembuat gambar. Ubah ide singkat berikut menjadi prompt bahasa Inggris yang sangat detail, dramatis, fotorealistik, dan bercerita panjang. Tambahkan instruksi ini di akhir: "4k resolution, masterpiece, highly detailed, cinematic lighting, sharp focus". Jangan gunakan kalimat sapaan, langsung berikan bahasa Inggrisnya saja. Ide singkat: ${userPrompt}`
    });

    const magicPrompt = chatResponse.text;

    // Update pesan status
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      statusMsg.message_id, 
      undefined, 
      `✅ *Prompt berhasil diracik:*\n_${magicPrompt}_\n\n🎨 2/2: Sedang menggambar dan mendownload resolusi HD (1080x1920)...`, 
      { parse_mode: 'Markdown' }
    );

    // --- TAHAP 2: GENERATE & DOWNLOAD GAMBAR HD ---
    const encodedPrompt = encodeURIComponent(magicPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true`;

    // Server Node.js mengambil (fetch) gambar dari URL AI
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
        throw new Error('Gagal mengambil gambar dari server AI pembuat gambar.');
    }

    // Mengubah hasil download menjadi bentuk Buffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Mengirim Buffer gambar langsung ke Telegram
    await ctx.replyWithPhoto(
      { source: imageBuffer }, 
      { caption: `✨ Berhasil! Ide awal: "${userPrompt}"\n\n_Cerita dan Gambar oleh AI_`, parse_mode: 'Markdown' }
    );
    
    // Hapus pesan loading yang menggantung
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);

  } catch (error) {
    console.error('Error di sistem:', error);
    // Jika error, usahakan hapus pesan loading lalu kirim pesan gagal
    try { await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch(e){}
    ctx.reply('Waduh, ada sistem yang macet. Mungkin prompt terlalu panjang atau server sedang sibuk. Coba lagi ya.');
  }
});

// ==========================================
// 5. JALANKAN BOT
// ==========================================
bot.launch().then(() => console.log('Bot AI Otomatis Jalan!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
