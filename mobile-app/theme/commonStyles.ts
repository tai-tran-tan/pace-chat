import { StyleSheet } from 'react-native';
import colors from './colors';
import typography from './typography';
import spacing from './spacing';

// Common text styles
export const textStyles = StyleSheet.create({
  h1: {
    fontSize: typography.textStyles.h1.fontSize,
    fontWeight: typography.textStyles.h1.fontWeight,
    lineHeight: typography.textStyles.h1.fontSize * typography.textStyles.h1.lineHeight,
    color: colors.text.primary,
  },
  h2: {
    fontSize: typography.textStyles.h2.fontSize,
    fontWeight: typography.textStyles.h2.fontWeight,
    lineHeight: typography.textStyles.h2.fontSize * typography.textStyles.h2.lineHeight,
    color: colors.text.primary,
  },
  h3: {
    fontSize: typography.textStyles.h3.fontSize,
    fontWeight: typography.textStyles.h3.fontWeight,
    lineHeight: typography.textStyles.h3.fontSize * typography.textStyles.h3.lineHeight,
    color: colors.text.primary,
  },
  h4: {
    fontSize: typography.textStyles.h4.fontSize,
    fontWeight: typography.textStyles.h4.fontWeight,
    lineHeight: typography.textStyles.h4.fontSize * typography.textStyles.h4.lineHeight,
    color: colors.text.primary,
  },
  body: {
    fontSize: typography.textStyles.body.fontSize,
    fontWeight: typography.textStyles.body.fontWeight,
    lineHeight: typography.textStyles.body.fontSize * typography.textStyles.body.lineHeight,
    color: colors.text.primary,
  },
  bodySmall: {
    fontSize: typography.textStyles.bodySmall.fontSize,
    fontWeight: typography.textStyles.bodySmall.fontWeight,
    lineHeight: typography.textStyles.bodySmall.fontSize * typography.textStyles.bodySmall.lineHeight,
    color: colors.text.secondary,
  },
  caption: {
    fontSize: typography.textStyles.caption.fontSize,
    fontWeight: typography.textStyles.caption.fontWeight,
    lineHeight: typography.textStyles.caption.fontSize * typography.textStyles.caption.lineHeight,
    color: colors.text.tertiary,
  },
  button: {
    fontSize: typography.textStyles.button.fontSize,
    fontWeight: typography.textStyles.button.fontWeight,
    lineHeight: typography.textStyles.button.fontSize * typography.textStyles.button.lineHeight,
    color: colors.primary.contrast,
  },
  label: {
    fontSize: typography.textStyles.label.fontSize,
    fontWeight: typography.textStyles.label.fontWeight,
    lineHeight: typography.textStyles.label.fontSize * typography.textStyles.label.lineHeight,
    color: colors.text.primary,
  },
  error: {
    fontSize: typography.textStyles.bodySmall.fontSize,
    fontWeight: typography.textStyles.bodySmall.fontWeight,
    color: colors.error.main,
  },
  success: {
    fontSize: typography.textStyles.bodySmall.fontSize,
    fontWeight: typography.textStyles.bodySmall.fontWeight,
    color: colors.success.main,
  },
});

// Common container styles
export const containerStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  padding: {
    padding: spacing.md,
  },
  paddingHorizontal: {
    paddingHorizontal: spacing.md,
  },
  paddingVertical: {
    paddingVertical: spacing.md,
  },
  margin: {
    margin: spacing.md,
  },
  marginHorizontal: {
    marginHorizontal: spacing.md,
  },
  marginVertical: {
    marginVertical: spacing.md,
  },
});

// Common button styles
export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  disabled: {
    backgroundColor: colors.border.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Common card styles
export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  flat: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});

// Common input styles
export const inputStyles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.textStyles.body.fontSize,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
  },
  focused: {
    borderColor: colors.primary.main,
  },
  error: {
    borderColor: colors.error.main,
  },
});

// Common list styles
export const listStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  item: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.md,
  },
});

// Common loading and empty states
export const stateStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
}); 