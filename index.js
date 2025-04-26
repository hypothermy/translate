const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

// CORS hatasını engellemek için CORS middleware'i
const cors = require('cors');
app.use(cors());

// API Key'i güvenli bir şekilde saklayın
const DEEPL_API_KEY = 'b4119cb8-8b03-498e-90af-ab639e06d18b:fx';

app.use(bodyParser.urlencoded({ extended: true }));

// DeepL API'ye çeviri yapmak için bir endpoint
app.post('/translate', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  try {
    const response = await axios.post('https://api-free.deepl.com/v2/translate', null, {
      params: {
        auth_key: DEEPL_API_KEY,
        text: text,
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase(),
      }
    });

    // Çeviri sonuçlarını frontend'e gönder
    res.json({ translatedText: response.data.translations[0].text });
  } catch (error) {
    console.error('DeepL API Error:', error);
    res.status(500).json({ error: 'Çeviri sırasında bir hata oluştu.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
