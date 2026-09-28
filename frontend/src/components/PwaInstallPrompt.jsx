import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { isInstallPromptAvailable, promptPwaInstall, subscribeToInstallPrompt, isRunningStandalone } from '../services/pwaService';
import { useLanguage } from '../context/LanguageContext';

export function PwaInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('exam_ai_pwa_dismissed') === 'true';
  });
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    if (isRunningStandalone()) {
      setCanInstall(false);
      return;
    }
    const unsubscribe = subscribeToInstallPrompt((available) => {
      setCanInstall(available);
    });
    return unsubscribe;
  }, []);

  if (!canInstall || isDismissed || isRunningStandalone()) {
    return null;
  }

  const handleInstallClick = async () => {
    const installed = await promptPwaInstall();
    if (installed) {
      setInstalledSuccess(true);
      setTimeout(() => setCanInstall(false), 3000);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('exam_ai_pwa_dismissed', 'true');
  };

  // Localized texts
  const labels = {
    en: {
      title: 'Install EXAM.AI App',
      desc: 'Install for a full-screen, secure, distraction-free examination experience.',
      btn: 'Install App',
      success: 'App Installed!'
    },
    ta: {
      title: 'EXAM.AI செயலியை நிறுவுக',
      desc: 'முழுத்திரை, பாதுகாப்பான தேர்வு அனுபவத்திற்கு நிறுவவும்.',
      btn: 'செயலியை நிறுவுக',
      success: 'செயலி நிறுவப்பட்டது!'
    },
    hi: {
      title: 'EXAM.AI ऐप इंस्टॉल करें',
      desc: 'पूर्ण-स्क्रीन, सुरक्षित परीक्षा अनुभव के लिए इंस्टॉल करें।',
      btn: 'ऐप इंस्टॉल करें',
      success: 'ऐप इंस्टॉल हो गया!'
    },
    te: {
      title: 'EXAM.AI యాప్‌ను ఇన్‌స్టాల్ చేయండి',
      desc: 'పూర్తి స్క్రీన్, సురక్షిత పరీక్ష అనుభవం కోసం ఇన్‌స్టాల్ చేయండి.',
      btn: 'యాప్ ఇన్‌స్టాల్ చేయండి',
      success: 'యాప్ ఇన్‌స్టాల్ చేయబడింది!'
    },
    ml: {
      title: 'EXAM.AI ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക',
      desc: 'പൂർണ്ണ സ്‌ക്രീൻ, സുരക്ഷിത പരീക്ഷാ അനുഭവത്തിനായി ഇൻസ്റ്റാൾ ചെയ്യുക.',
      btn: 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക',
      success: 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്തു!'
    },
    kn: {
      title: 'EXAM.AI ಅಪ್ಲಿಕೇಶನ್ ಸ್ಥಾಪಿಸಿ',
      desc: 'ಪೂರ್ಣ-ಪರದೆ, ಸುರಕ್ಷಿತ ಪರೀಕ್ಷಾ ಅನುಭವಕ್ಕಾಗಿ ಸ್ಥಾಪಿಸಿ.',
      btn: 'ಅಪ್ಲಿಕೇಶನ್ ಸ್ಥಾಪಿಸಿ',
      success: 'ಅಪ್ಲಿಕೇಶನ್ ಸ್ಥಾಪಿಸಲಾಗಿದೆ!'
    }
  };

  const text = labels[language] || labels.en;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(129, 140, 248, 0.3)',
        borderRadius: '12px',
        padding: '10px 16px',
        margin: '12px 16px 0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 50,
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(129, 140, 248, 0.4)'
          }}
        >
          {installedSuccess ? (
            <CheckCircle2 size={20} color="#ffffff" />
          ) : (
            <Smartphone size={20} color="#ffffff" />
          )}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
            {installedSuccess ? text.success : text.title}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {text.desc}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!installedSuccess && (
          <button
            onClick={handleInstallClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={14} />
            {text.btn}
          </button>
        )}
        <button
          onClick={handleDismiss}
          title="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
