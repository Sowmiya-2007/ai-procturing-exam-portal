import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { subscribeToOnlineStatus } from '../services/pwaService';
import { useLanguage } from '../context/LanguageContext';

export function OfflineMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = subscribeToOnlineStatus((online) => {
      setIsOnline(online);
      if (!online) {
        wasOffline = true;
      } else if (wasOffline) {
        setShowReconnected(true);
        const timer = setTimeout(() => setShowReconnected(false), 4000);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, []);

  const messages = {
    en: {
      offlineTitle: 'Internet Connection Lost',
      offlineMsg: 'Please reconnect. Your examination session and responses are safely held in memory and being monitored.',
      onlineTitle: 'Connected',
      onlineMsg: 'Connection to examination servers restored.'
    },
    ta: {
      offlineTitle: 'இணைய இணைப்பு துண்டிக்கப்பட்டது',
      offlineMsg: 'தயவுசெய்து மீண்டும் இணைக்கவும். உங்கள் தேர்வு அமர்வு பாதுகாப்பாக கண்காணிக்கப்படுகிறது.',
      onlineTitle: 'இணைக்கப்பட்டது',
      onlineMsg: 'தேர்வு சேவையகங்களுடன் இணைப்பு மீட்டமைக்கப்பட்டது.'
    },
    hi: {
      offlineTitle: 'इंटरनेट कनेक्शन कट गया',
      offlineMsg: 'कृपया पुनः कनेक्ट करें। आपका परीक्षा सत्र सुरक्षित रूप से निगरानी में है।',
      onlineTitle: 'पुनः कनेक्ट हुआ',
      onlineMsg: 'परीक्षा सर्वर से कनेक्शन बहाल हो गया।'
    },
    te: {
      offlineTitle: 'ఇంటర్నెట్ కనెక్షన్ పోయింది',
      offlineMsg: 'దయచేసి తిరిగి కనెక్ట్ అవ్వండి. మీ పరీక్షా సెషన్ సురక్షితంగా పర్యవేక్షించబడుతోంది.',
      onlineTitle: 'కనెక్ట్ చేయబడింది',
      onlineMsg: 'పరీక్షా సర్వర్‌లకు కనెక్షన్ పునరుద్ధరించబడింది.'
    },
    ml: {
      offlineTitle: 'ഇന്റർനെറ്റ് കണക്ഷൻ നഷ്ടപ്പെട്ടു',
      offlineMsg: 'ദയവായി വീണ്ടും കണക്റ്റ് ചെയ്യുക. നിങ്ങളുടെ പരീക്ഷാ സെഷൻ നിരീക്ഷിക്കപ്പെടുന്നു.',
      onlineTitle: 'കണക്റ്റ് ചെയ്തു',
      onlineMsg: 'പരീക്ഷാ സെർവറുകളിലേക്കുള്ള കണക്ഷൻ പുനഃസ്ഥാപിച്ചു.'
    },
    kn: {
      offlineTitle: 'ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಕಡಿತಗೊಂಡಿದೆ',
      offlineMsg: 'ದಯವಿಟ್ಟು ಮರುಸಂಪರ್ಕಿಸಿ. ನಿಮ್ಮ ಪರೀಕ್ಷಾ ಸೆಷನ್ ಅನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಲಾಗುತ್ತಿದೆ.',
      onlineTitle: 'ಸಂಪರ್ಕಗೊಂಡಿದೆ',
      onlineMsg: 'ಪರೀಕ್ಷಾ ಸರ್ವರ್‌ಗಳ ಸಂಪರ್ಕ ಪುನಃಸ್ಥಾಪಿಸಲಾಗಿದೆ.'
    }
  };

  const msg = messages[language] || messages.en;

  if (isOnline && !showReconnected) {
    return null;
  }

  if (!isOnline) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.98), rgba(153, 27, 27, 0.98))',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(220, 38, 38, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '90vw',
          width: 'max-content',
          border: '1px solid rgba(254, 202, 202, 0.4)',
          animation: 'bounceIn 0.3s ease-in-out'
        }}
      >
        <WifiOff size={22} color="#fecaca" />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{msg.offlineTitle}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.95 }}>{msg.offlineMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.98), rgba(21, 128, 61, 0.98))',
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(22, 163, 74, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '90vw',
        width: 'max-content',
        border: '1px solid rgba(187, 247, 208, 0.4)',
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <Wifi size={20} color="#bbf7d0" />
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{msg.onlineTitle}</div>
        <div style={{ fontSize: '0.78rem', opacity: 0.95 }}>{msg.onlineMsg}</div>
      </div>
    </div>
  );
}
