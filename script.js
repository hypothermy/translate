const startBtn = document.getElementById('startRecord');
const stopBtn = document.getElementById('stopRecord');
const originalText = document.getElementById('originalText');
const translatedText = document.getElementById('translatedText');
const user1Lang = document.getElementById('user1Language');
const user2Lang = document.getElementById('user2Language');

let recorder, audioBlob;
let turn = 1; // 1. kullanıcı mı 2. kullanıcı mı

const assemblyApiKey = 'f2acbc8f1bbf4ef3a8250456be6406a9';
const deeplApiKey = 'b4119cb8-8b03-498e-90af-ab639e06d18b:fx';

// Ses kaydını başlat
startBtn.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = async () => {
    audioBlob = new Blob(chunks, { type: 'audio/webm' });
    await handleAudio(audioBlob);
  };

  recorder.start();
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

// Ses kaydını durdur
stopBtn.addEventListener('click', () => {
  recorder.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// Ses kaydını işleme ve çeviri
async function handleAudio(blob) {
  const uploadUrl = await uploadToAssembly(blob);
  const transcript = await getTranscript(uploadUrl);
  
  if (transcript) {
    originalText.textContent = transcript;
    await translateText(transcript);
    changeTurn();
  } else {
    alert('Transkripsiyon başarısız oldu.');
  }
}

// AssemblyAI'ye dosya yükle
async function uploadToAssembly(blob) {
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'authorization': assemblyApiKey,
    },
    body: blob
  });
  const data = await response.json();
  return data.upload_url;
}

// AssemblyAI ile transkript al
async function getTranscript(uploadUrl) {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': assemblyApiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      language_code: turn === 1 ? user1Lang.value : user2Lang.value
    })
  });
  const data = await response.json();

  let transcriptId = data.id;

  // Transkript tamamlanana kadar bekle
  let completed = false;
  let transcriptText = '';

  while (!completed) {
    const polling = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'authorization': assemblyApiKey }
    });
    const result = await polling.json();

    if (result.status === 'completed') {
      completed = true;
      transcriptText = result.text;
    } else if (result.status === 'failed') {
      completed = true;
      transcriptText = null;
    } else {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return transcriptText;
}

// DeepL ile çeviri
async function translateText(text) {
  const sourceLang = turn === 1 ? user1Lang.value.toUpperCase() : user2Lang.value.toUpperCase();
  const targetLang = turn === 1 ? user2Lang.value.toUpperCase() : user1Lang.value.toUpperCase();

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${deeplApiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `text=${encodeURIComponent(text)}&source_lang=${sourceLang}&target_lang=${targetLang}`
  });

  const data = await response.json();
  translatedText.textContent = data.translations[0].text;
}

// Sırayı değiştir
function changeTurn() {
  turn = turn === 1 ? 2 : 1;
  alert(`Şimdi ${turn}. kullanıcının sırası!`);
}
