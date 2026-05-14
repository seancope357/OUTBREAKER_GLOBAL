import { GoogleGenAI, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
let audioContext: AudioContext | null = null;

const speakWithBrowser = async (text: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn('Browser TTS API unavailable.');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 0.95;
  utterance.rate = 1.0;
  utterance.volume = 1.0;
  utterance.lang = 'en-US';

  return new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
};

const getAI = () => {
  if (!aiInstance) {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured.');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const playBriefingAudio = async (text: string) => {
  try {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      await speakWithBrowser(text);
      return;
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (!part?.inlineData?.data) {
      console.warn("No audio data received from TTS model.");
      await speakWithBrowser(text);
      return;
    }

    const { data: base64Audio, mimeType } = part.inlineData;
    
    if (mimeType && (mimeType.includes("wav") || mimeType.includes("mpeg") || mimeType.includes("mp3"))) {
      const audioUrl = `data:${mimeType};base64,${base64Audio}`;
      const audio = new Audio(audioUrl);
      await audio.play();
      return;
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }
    
    const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();

  } catch (error) {
    console.error("Failed to play TTS audio:", error);
    await speakWithBrowser(text);
  }
};
