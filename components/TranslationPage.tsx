import React, { useState, useEffect } from 'react';
import { sendMessageToGemini } from '../services/geminiService';
import { DayPlan } from '../types';
import { Mic, Volume2, ArrowRightLeft, Sparkles, ChevronDown, DollarSign } from 'lucide-react';

interface TranslationPageProps {
  currentLanguage: string;
  context: any; // Passed for AI context
}

export const TranslationPage: React.FC<TranslationPageProps> = ({ currentLanguage, context }) => {
  const [sourceLang, setSourceLang] = useState("English");
  const [targetLang, setTargetLang] = useState(currentLanguage);
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Sync target language if location changes, but don't overwrite if user is actively swapping
  // logic: default target is the location's language.
  useEffect(() => {
    // Only update if we are in a 'default' state (English -> Something) to avoid messing up manual swaps
    if (sourceLang === 'English') {
      setTargetLang(currentLanguage);
    }
  }, [currentLanguage]);

  const supportedLanguages = [
    "English", "Dutch", "German", "French", "Spanish", "Italian", "Indonesian", "Japanese", "Chinese", "Arabic", "Korean", "Thai", "Vietnamese"
  ];

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);

    try {
      const prompt = `
[TASK: TRANSLATION]
        Source Language: ${sourceLang}
        Target Language: ${targetLang}
        User Context: Tourist / Traveler.
        Text to translate: "${inputText}"
        
        Output ONLY the translated text, no explanations.
      `;

      // Pass empty history [] as translation is single-shot
      const result = await sendMessageToGemini(prompt, [], context);
      setTranslatedText(result);
    } catch (e) {
      console.error(e);
      setTranslatedText("Error: Could not translate.");
    } finally {
      setIsTranslating(false);
    }
  };

  const commonPhrases = [
    "Where is the bathroom?",
    "I have a food allergy (No Pork).",
    "How much does this cost?",
    "Can you help me?",
    "Thank you very much."
  ];

  const handlePhraseClick = (phrase: string) => {
    // If source is not English, just insert text but don't auto-translate as it might be confusing
    setInputText(phrase);
    if (sourceLang === 'English') {
      setIsTranslating(true);
      const prompt = `
[TASK: TRANSLATION]
            Source Language: English
            Target Language: ${targetLang}
            User Context: Tourist / Traveler.
            Text to translate: "${phrase}"
            Output ONLY the translated text.
        `;
      sendMessageToGemini(prompt, [], context).then(setTranslatedText).finally(() => setIsTranslating(false));
    }
  };

  // --- CURRENCY CONVERTER STATE ---
  const [amount, setAmount] = useState<string>('');
  const [convertedAmount, setConvertedAmount] = useState<string | null>(null);

  // Mock conversion (mock implementation again, duplicates logic from Dashboard for now but isolated)
  const handleConvert = () => {
    if (!amount) return;
    // Mock: Assume Local to USD for now. Ideally pass currencies in props.
    // 1000 JPY = 6.50 USD approx
    const val = parseFloat(amount);
    if (isNaN(val)) return;

    // Heuristic: If amount > 100, assume high denom (JPY), else low denom (EUR)
    let rate = 0;
    let target = 'USD';
    if (val > 100) {
      rate = 0.0065; // JPY -> USD
    } else {
      rate = 1.08; // EUR -> USD
    }

    setConvertedAmount((val * rate).toFixed(2) + ' ' + target);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto pb-24">
      <header className="mb-6">
        <h1 className="text-3xl font-display font-bold text-dynac-darkChoc">Translation & Tools</h1>
        <p className="text-dynac-nutBrown/60">AI-powered local assistance</p>
      </header>

      {/* Currency Converter Section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-dynac-sand/30 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-green-100 rounded-full text-green-700">
            <DollarSign size={20} />
          </div>
          <h2 className="text-lg font-bold text-dynac-darkChoc">Smart Currency Converter</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-dynac-nutBrown uppercase tracking-wider mb-1 block">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full bg-dynac-sand/20 rounded-lg p-3 text-dynac-darkChoc font-medium focus:outline-none focus:ring-2 focus:ring-dynac-gold/20"
            />
          </div>
          <button
            onClick={handleConvert}
            className="mt-5 bg-dynac-gold text-white p-3 rounded-lg shadow-md hover:bg-dynac-gold/90 transition-colors"
          >
            <ArrowRightLeft size={20} />
          </button>
          <div className="flex-1">
            <label className="text-xs font-bold text-dynac-nutBrown uppercase tracking-wider mb-1 block">Converted ({targetLang === 'English' ? 'USD' : 'Local'})</label>
            <div className="w-full bg-dynac-sand/20 rounded-lg p-3 text-dynac-darkChoc font-medium min-h-[48px] flex items-center justify-between">
              <span>{convertedAmount || '---'}</span>
              <span className="text-xs font-bold text-dynac-nutBrown opacity-50">{targetLang === 'English' ? 'USD' : 'EUR/JPY'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Translation Section */}
      <div className="bg-white rounded-3xl p-1 shadow-xl border border-dynac-lightBrown/20 relative">
        <div className="bg-dynac-cream rounded-[20px] p-4">
          {/* Header with Languages */}
          <div className="flex items-center justify-between mb-2">
            {/* Source */}
            <div className="relative group">
              <button className="flex items-center gap-2 text-dynac-darkChoc font-bold text-lg hover:text-dynac-lightBrown transition-colors">
                {sourceLang} <ChevronDown size={16} className="opacity-50" />
              </button>
              {/* Dropdown (Mock) */}
              <div className="absolute top-full left-0 mt-2 w-40 bg-white shadow-xl rounded-xl p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 border border-dynac-sand">
                {supportedLanguages.map(l => (
                  <button key={l} onClick={() => { setSourceLang(l); if (l !== 'English') setTargetLang('English'); }} className="w-full text-left p-2 hover:bg-dynac-sand/30 rounded-lg text-sm font-medium text-dynac-darkChoc">
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2 rounded-full bg-white/50 text-dynac-lightBrown/50 cursor-pointer hover:bg-white hover:text-dynac-lightBrown transition-all" onClick={handleSwapLanguages}>
              <ArrowRightLeft size={20} />
            </div>

            {/* Target */}
            <div className="relative group">
              <div className="flex items-center gap-2 text-dynac-darkChoc font-bold text-lg hover:text-dynac-lightBrown transition-colors cursor-pointer">
                {targetLang} <ChevronDown size={16} className="opacity-50" />
              </div>
              <div className="absolute top-full right-0 mt-2 w-40 bg-white shadow-xl rounded-xl p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 border border-dynac-sand">
                {supportedLanguages.map(l => (
                  <button key={l} onClick={() => setTargetLang(l)} className="w-full text-left p-2 hover:bg-dynac-sand/30 rounded-lg text-sm font-medium text-dynac-darkChoc">
                    {l}
                  </button>
                ))}
              </div>
              <span className="absolute -top-1.5 right-0 text-[8px] bg-dynac-sand px-1 rounded text-dynac-nutBrown">Auto</span>
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white rounded-xl shadow-sm border border-dynac-sand p-4 relative">
            <label className="text-xs font-bold text-dynac-nutBrown uppercase tracking-wider mb-2 block">{sourceLang}</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Type ${sourceLang} text...`}
              className="w-full text-lg text-dynac-darkChoc placeholder-dynac-nutBrown/30 resize-none focus:outline-none bg-transparent"
              rows={3}
            />
            <button className="absolute bottom-3 right-3 text-dynac-lightBrown/50 hover:text-dynac-lightBrown transition-colors">
              <Mic size={20} />
            </button>
          </div>

          <div className="flex justify-center -my-2 z-10">
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="bg-dynac-lightBrown text-dynac-cream rounded-full p-3 shadow-lg hover:scale-105 transition-transform flex items-center gap-2 px-6"
            >
              {isTranslating ? <Sparkles size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
              <span className="font-bold text-sm">Translate</span>
            </button>
          </div>

          {/* Output Area */}
          <div className="bg-dynac-lightBrown/5 rounded-xl shadow-inner border border-dynac-lightBrown/10 p-4">
            <label className="text-xs font-bold text-dynac-lightBrown uppercase tracking-wider mb-2 block">{targetLang}</label>
            <div className="min-h-[80px] text-xl font-medium text-dynac-darkChoc flex items-center">
              {translatedText || <span className="text-dynac-nutBrown/30 italic">Translation will appear here...</span>}
            </div>
          </div>

          {/* Quick Phrases */}
          {sourceLang === 'English' && (
            <div>
              <h3 className="text-sm font-bold text-dynac-darkChoc mb-3 mt-2">Phrasebook Shortcuts</h3>
              <div className="space-y-2">
                {commonPhrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePhraseClick(phrase)}
                    className="w-full text-left bg-dynac-sand/50 hover:bg-dynac-sand p-3 rounded-lg text-sm text-dynac-darkChoc transition-colors flex justify-between items-center group"
                  >
                    {phrase}
                    <ArrowRightLeft size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
