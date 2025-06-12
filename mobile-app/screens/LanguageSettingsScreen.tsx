import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, RadioButton, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSettingsScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.language')}</Text>
        <Text style={styles.subtitle}>
          Choose your preferred language for the app
        </Text>
      </View>

      <View style={styles.languageList}>
        {availableLanguages.map((language) => (
          <List.Item
            key={language.code}
            title={`${language.flag} ${language.nativeName}`}
            description={language.name}
            left={() => (
              <RadioButton
                value={language.code}
                status={currentLanguage === language.code ? 'checked' : 'unchecked'}
                onPress={() => handleLanguageChange(language.code)}
              />
            )}
            onPress={() => handleLanguageChange(language.code)}
            style={[
              styles.languageItem,
              currentLanguage === language.code && {
                backgroundColor: theme.colors.primaryContainer
              }
            ]}
            titleStyle={[
              styles.languageTitle,
              currentLanguage === language.code && {
                color: theme.colors.primary
              }
            ]}
            descriptionStyle={styles.languageDescription}
          />
        ))}
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Language changes will be applied immediately. Some text may take a moment to update.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    padding: 20,
    paddingBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16,
    color: '#666'
  },
  languageList: {
    marginTop: 10
  },
  languageItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    paddingVertical: 8
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  languageDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  info: {
    padding: 20,
    paddingTop: 10
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default LanguageSettingsScreen; 