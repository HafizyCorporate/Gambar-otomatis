require('dotenv').config();
const { Telegraf } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');

// ==========================================
// 1. SETUP SERVER (UNTUK RAILWAY)
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('Server Bot AI Super Jalan!'));
app.listen(process.env.PORT || 3000, () => console.log('Web server aktif!'));


    // --- TAHAP 2: GENERATE GAMBAR LANGSUNG RESOLUSI TINGGI ---
    const encodedPrompt = encodeURIComponent(magicPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true`;

    // Kita perintahkan server Node.js (Railway) untuk mendownload gambarnya dulu
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
        throw new Error('Gagal mengambil gambar dari server AI pembuat gambar.');
    }

    // Mengubah hasil download menjadi bentuk Buffer (File Fisik)
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Mengirim gambar hasil akhir ke Telegram menggunakan Buffer (source), BUKAN url lagi
    await ctx.replyWithPhoto(
      { source: imageBuffer }, 
      { caption: `✨ Berhasil! Ide awal: "${userPrompt}"\n\n_Cerita dan Gambar oleh AI_`, parse_mode: 'Markdown' }
    );
    
    // Membersihkan pesan loading
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);

  } catch (error) {
    console.error('Error di sistem:', error);
    // Pastikan pesan loading dihapus kalau terjadi error
    try { await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch(e){}
    ctx.reply('Waduh, ada kendala saat memproses gambarnya. Mungkin prompt terlalu panjang atau server gambar sedang sibuk. Coba lagi ya.');
  }
});

// ==========================================
// 3. LOGIKA UTAMA: TEKS -> PROMPT -> GAMBAR HD
// ==========================================
bot.command('gambar', async (ctx) => {
  const userPrompt = ctx.message.text.split(' ').slice(1).join(' ');

  if (!userPrompt) {
    return ctx.reply('Tolong kasih ide singkatnya! Contoh: /gambar orang angkat batu');
  }

  // Pesan status tahap 1
  const statusMsg = await ctx.reply('⏳ 1/2: Meminta Gemini meracik ide ceritamu menjadi prompt epik...');

  try {
    // --- TAHAP 1: GEMINI TEXT MEMBUAT PROMPT CERITA ---
    // Kita pakai model teks yang aman dari error kuota Limit 0
    const chatResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: `Kamu adalah ahli prompt pembuat gambar. Ubah ide singkat berikut menjadi prompt bahasa Inggris yang sangat detail, dramatis, fotorealistik, dan bercerita panjang. Tambahkan instruksi ini di akhir: "4k resolution, masterpiece, highly detailed, cinematic lighting, sharp focus". Jangan gunakan kalimat sapaan, langsung berikan bahasa Inggrisnya saja. Ide singkat: ${userPrompt}`
    });

    // Mengambil teks bahasa Inggris hasil racikan Gemini
    const magicPrompt = chatResponse.text;

    // Update pesan status ke tahap 2
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      statusMsg.message_id, 
      undefined, 
      `✅ *Prompt berhasil diracik:*\n_${magicPrompt}_\n\n🎨 2/2: Sedang menggambar dalam resolusi HD (1080x1920)...`, 
      { parse_mode: 'Markdown' }
    );

    // --- TAHAP 2: GENERATE GAMBAR LANGSUNG RESOLUSI TINGGI ---
    // Mengubah prompt bahasa Inggris agar aman dibaca oleh URL web
    const encodedPrompt = encodeURIComponent(magicPrompt);
    
    // Kita panggil API gratis dengan resolusi 1080x1920 (Kualitas Layar HP HD)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true`;

    // Mengirim gambar hasil akhir ke Telegram
    await ctx.replyWithPhoto(
      { url: imageUrl }, 
      { caption: `✨ Berhasil! Ide awal: "${userPrompt}"\n\n_Cerita dan Gambar oleh AI_`, parse_mode: 'Markdown' }
    );
    
    // Membersihkan pesan loading
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);

  } catch (error) {
    console.error('Error di sistem:', error);
    ctx.reply('Waduh, ada sistem yang macet. Mungkin limit API teks Google sedang antre, coba sebentar lagi ya.');
  }
});

// Jalankan Bot
bot.launch().then(() => console.log('Bot AI Otomatis Jalan!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
