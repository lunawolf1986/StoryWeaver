
// System instruction to kill the whisper and boost volume
const NARRATOR_INSTRUCTION = `
  You are a booming, cinematic narrator. 
  CRITICAL: Speak with maximum physical volume and intensity. 
  Wrap all output in <speak><prosody volume="+20dB" pitch="-2st" rate="95%">[TEXT]</prosody></speak>. 
  Do not whisper. Do not use a soothing tone.
`;

export const generateAudio = async (text: string, voiceId: string) => {
  // We explicitly use gemini-1.5-flash to avoid the 'Quota Exceeded' errors 
  // that happen with the 2.5 or Pro models.
  const model = "gemini-1.5-flash"; 
  
  const config = {
    audioConfig: {
      audioEncoding: 'MP3',
      // This profile optimizes for big speakers, making it much louder
      effectsProfileId: ['large-home-entertainment-class-device'], 
      pitch: -2.0,
      speakingRate: 0.95,
    },
    // Adding a token limit helps prevent the "Resource Exhausted" crash
    maxOutputTokens: 1024, 
  };

  // Logic to send directly to Google API goes here...
  // (Ensure your API Key is set in your Vercel Environment Variables!)
};
