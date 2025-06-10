import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const ThemeExample = () => {
  const theme = useTheme();

  return (
    <ScrollView style={[theme.containerStyles.flex, { backgroundColor: theme.colors.background.primary }]}>
      <View style={theme.containerStyles.padding}>
        
        {/* Typography Examples */}
        <View style={theme.containerStyles.marginVertical}>
          <Text style={theme.textStyles.h1}>Heading 1</Text>
          <Text style={theme.textStyles.h2}>Heading 2</Text>
          <Text style={theme.textStyles.h3}>Heading 3</Text>
          <Text style={theme.textStyles.h4}>Heading 4</Text>
          <Text style={theme.textStyles.body}>Body text - This is the main content text</Text>
          <Text style={theme.textStyles.bodySmall}>Body small - Secondary content</Text>
          <Text style={theme.textStyles.caption}>Caption - Small helper text</Text>
          <Text style={theme.textStyles.label}>Label - Form labels</Text>
          <Text style={theme.textStyles.error}>Error text</Text>
          <Text style={theme.textStyles.success}>Success text</Text>
        </View>

        {/* Button Examples */}
        <View style={theme.containerStyles.marginVertical}>
          <TouchableOpacity style={theme.buttonStyles.primary}>
            <Text style={theme.textStyles.button}>Primary Button</Text>
          </TouchableOpacity>
          
          <View style={{ height: theme.spacing.sm }} />
          
          <TouchableOpacity style={theme.buttonStyles.secondary}>
            <Text style={[theme.textStyles.button, { color: theme.colors.text.primary }]}>
              Secondary Button
            </Text>
          </TouchableOpacity>
          
          <View style={{ height: theme.spacing.sm }} />
          
          <TouchableOpacity style={theme.buttonStyles.disabled}>
            <Text style={[theme.textStyles.button, { color: theme.colors.text.disabled }]}>
              Disabled Button
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card Examples */}
        <View style={theme.containerStyles.marginVertical}>
          <View style={theme.cardStyles.base}>
            <Text style={theme.textStyles.h4}>Card with Shadow</Text>
            <Text style={theme.textStyles.bodySmall}>
              This card uses the base card style with shadow
            </Text>
          </View>
          
          <View style={{ height: theme.spacing.sm }} />
          
          <View style={theme.cardStyles.flat}>
            <Text style={theme.textStyles.h4}>Flat Card</Text>
            <Text style={theme.textStyles.bodySmall}>
              This card uses the flat card style with border
            </Text>
          </View>
        </View>

        {/* Color Examples */}
        <View style={theme.containerStyles.marginVertical}>
          <Text style={theme.textStyles.h3}>Color Palette</Text>
          
          <View style={theme.containerStyles.row}>
            <View style={{
              width: 50,
              height: 50,
              backgroundColor: theme.colors.primary.main,
              marginRight: theme.spacing.sm,
              borderRadius: theme.spacing.xs,
            }} />
            <Text style={theme.textStyles.body}>Primary</Text>
          </View>
          
          <View style={theme.containerStyles.row}>
            <View style={{
              width: 50,
              height: 50,
              backgroundColor: theme.colors.secondary.main,
              marginRight: theme.spacing.sm,
              borderRadius: theme.spacing.xs,
            }} />
            <Text style={theme.textStyles.body}>Secondary</Text>
          </View>
          
          <View style={theme.containerStyles.row}>
            <View style={{
              width: 50,
              height: 50,
              backgroundColor: theme.colors.success.main,
              marginRight: theme.spacing.sm,
              borderRadius: theme.spacing.xs,
            }} />
            <Text style={theme.textStyles.body}>Success</Text>
          </View>
          
          <View style={theme.containerStyles.row}>
            <View style={{
              width: 50,
              height: 50,
              backgroundColor: theme.colors.error.main,
              marginRight: theme.spacing.sm,
              borderRadius: theme.spacing.xs,
            }} />
            <Text style={theme.textStyles.body}>Error</Text>
          </View>
        </View>

        {/* Spacing Examples */}
        <View style={theme.containerStyles.marginVertical}>
          <Text style={theme.textStyles.h3}>Spacing Examples</Text>
          
          <View style={{ marginBottom: theme.spacing.xs }}>
            <Text style={theme.textStyles.body}>Extra Small spacing ({theme.spacing.xs}px)</Text>
          </View>
          
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text style={theme.textStyles.body}>Small spacing ({theme.spacing.sm}px)</Text>
          </View>
          
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={theme.textStyles.body}>Medium spacing ({theme.spacing.md}px)</Text>
          </View>
          
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text style={theme.textStyles.body}>Large spacing ({theme.spacing.lg}px)</Text>
          </View>
          
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text style={theme.textStyles.body}>Extra Large spacing ({theme.spacing.xl}px)</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
};

export default ThemeExample; 