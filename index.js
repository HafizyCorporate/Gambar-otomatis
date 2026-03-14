require('dotenv').config();
const { Telegraf } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');

// ==========================================
// 1. SETUP SERVER (UNTUK RAILWAY)
// ==========================================
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Server Bot Telegram AI Jalan!'));
app.listen(port, () => console.log(`Server web port ${port}`));

// ==========================================
// 2. INISIALISASI BOT & GOOGLE AI
// ==========================================
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

bot.start((ctx) => {
  ctx.reply('Halo! Ketik /gambar [ide singkat]. Aku akan meracik ceritanya dan membuatkan gambar HD untukmu!');
});

bot.command('gambar', async (ctx) => {
  const userPrompt = ctx.message.text.split(' ').slice(1).join(' ');

  if (!userPrompt) {
    return ctx.reply('Tolong kasih ide singkatnya! Contoh: /gambar pisang kemakan tikus');
  }

  const statusMsg = await ctx.reply('⏳ 1/2: Meminta Gemini meracik ide ceritamu...');

  try {
    // --- TAHAP 1: GEMINI TEXT MEMBUAT PROMPT CERITA ---
    // PERBAIKAN 1: Membatasi Gemini maksimal 40 kata agar URL tidak kepanjangan
    const chatResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: `Ubah ide ini jadi prompt gambar bahasa Inggris. Detail, dramatis, fotorealistik. MAKSIMAL 40 KATA. Akhiri dengan: "4k resolution, masterpiece, cinematic lighting". Ide: ${userPrompt}`
    });

    const magicPrompt = chatResponse.text.trim();

    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      statusMsg.message_id, 
      undefined, 
      `✅ *Prompt diracik:*\n_${magicPrompt}_\n\n🎨 2/2: Sedang menggambar resolusi HD (1080x1920)...`, 
      { parse_mode: 'Markdown' }
    );

    // --- TAHAP 2: GENERATE & DOWNLOAD GAMBAR HD ---
    const encodedPrompt = encodeURIComponent(magicPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true`;

    // PERBAIKAN 2: Trik "User-Agent" palsu agar tidak diblokir server karena dikira bot spam
    const imageResponse = await fetch(imageUrl, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        }
    });
    
    if (!imageResponse.ok) {
        throw new Error(`Akses ditolak server AI. Kode Error: ${imageResponse.status}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    await ctx.replyWithPhoto(
      { source: imageBuffer }, 
      { caption: `✨ Berhasil! Ide awal: "${userPrompt}"\n\n_Cerita dan Gambar oleh AI_`, parse_mode: 'Markdown' }
    );
    
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);

  } catch (error) {
    console.error('Error di sistem:', error);
    try { await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch(e){}
    // Memunculkan pesan error asli ke chat agar kita gampang cari tahu kalau masih gagal
    ctx.reply(`Waduh macet. Info sistem: ${error.message}`);
  }
});

bot.launch().then(() => console.log('Bot AI Otomatis Jalan!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
