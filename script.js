const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const user1LanguageSelect = document.getElementById('user1Language');
const user2LanguageSelect = document.getElementById('user2Language');
const originalText = document.getElementById('originalText');
const translatedText = document.getElementById('translatedText');

let mediaRecorder;
let audioChunks = [];
let isUser1Turn = true; // İlk başta 1. kullanıcı konuşacak

const assemblyApiKey = 'f2acbc8f1bbf4ef3a8250456be6406a9';
const deepLApiKey = 'b4119cb8-8b03-498e-90af-ab639e06d18b:fx';

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

async function startRecording() {
  audioChunks = [];

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  
  mediaRecorder.start();
  startBtn.disabled = true;
  stopBtn.disabled = false;

  mediaRecorder.addEventListener("dataavailable", event => {
    audioChunks.push(event.data);
  });
}

async function stopRecording() {
  mediaRecorder.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;

  mediaRecorder.addEventListener("stop", async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
    const audioUrl = await uploadAudio(audioBlob);
    const transcription = await transcribeAudio(audioUrl);
    
    originalText.textContent = "Orijinal: " + transcription;

    const translated = await translateText(transcription);
    translatedText.textContent = "Çeviri: " + translated;

    isUser1Turn = !isUser1Turn; // Kullanıcı sırası değişsin
  });
}

async function uploadAudio(blob) {
  const formData = new FormData();
  formData.append('file', blob);

  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'authorization': assemblyApiKey
    },
    body: blob
  });

  const data = await response.json();
  return data.upload_url;
}

async function transcribeAudio(audioUrl) {
  const languageCode = isUser1Turn ? user1LanguageSelect.value : user2LanguageSelect.value;

  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': assemblyApiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: languageCode
    })
  });

  const data = await response.json();

  // Beklemek gerekiyor transkripsiyon bitene kadar
  while (data.status !== 'completed') {
    const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${data.id}`, {
      headers: {
        'authorization': assemblyApiKey
      }
    });
    const pollingData = await pollingResponse.json();

    if (pollingData.status === 'completed') {
      return pollingData.text;
    } else if (pollingData.status === 'failed') {
      throw new Error('Transkripsiyon başarısız.');
    }

    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 saniye bekle
  }
}

async function translateText(text) {
    const sourceLang = isUser1Turn ? user1LanguageSelect.value : user2LanguageSelect.value;
    const targetLang = isUser1Turn ? user2LanguageSelect.value : user1LanguageSelect.value;
  
    // Proxy URL ekliyoruz
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const deepLUrl = 'https://api-free.deepl.com/v2/translate';
  
    try {
      const response = await fetch(proxyUrl + deepLUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${deepLApiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `text=${encodeURIComponent(text)}&source_lang=${sourceLang.toUpperCase()}&target_lang=${targetLang.toUpperCase()}`
      });
  
      const data = await response.json();
      return data.translations[0].text;
  
    } catch (error) {
      console.error("Çeviri hatası:", error);
      return "Çeviri yapılamadı.";
    }
  }
  