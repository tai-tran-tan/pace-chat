import React from 'react';
import { View, Text } from 'react-native';
import { Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

// Example component showing how to use i18n
const I18nExample = () => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'en' ? 'vi' : 'en';
    changeLanguage(newLanguage);
  };

  return (
    <View style={{ padding: 20 }}>
      {/* Basic translation */}
      <Text>{t('common.loading')}</Text>
      
      {/* Translation with interpolation */}
      <Text>{t('chat.unreadMessages', { count: 5 })}</Text>
      
      {/* Translation with pluralization */}
      <Text>
        {t('chat.unreadMessages', { count: 1, defaultValue: '1 unread message' })}
      </Text>
      
      {/* Current language display */}
      <Text>Current language: {currentLanguage}</Text>
      
      {/* Language toggle button */}
      <Button onPress={handleLanguageToggle}>
        {t('settings.language')}
      </Button>
      
      {/* Error messages */}
      <Text>{t('errors.networkError')}</Text>
      
      {/* Form labels */}
      <Text>{t('auth.email')}</Text>
      <Text>{t('auth.password')}</Text>
    </View>
  );
};

export default I18nExample; 