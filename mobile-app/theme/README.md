# Theme System

The theme system is designed to manage styles consistently and easily change the entire application from one place.

## Theme Structure

### 1. Colors (`colors.ts`)
Defines all colors in the application:
- **Primary colors**: Main application colors
- **Background colors**: Background colors
- **Text colors**: Text colors
- **Status colors**: Status colors (success, error, warning, info)
- **UI colors**: Colors for UI components

### 2. Typography (`typography.ts`)
Defines fonts and sizes:
- **Font sizes**: xs, sm, md, lg, xl, xxl, xxxl
- **Font weights**: regular, medium, semibold, bold
- **Text styles**: h1, h2, h3, h4, body, bodySmall, caption, button, label

### 3. Spacing (`spacing.ts`)
Defines spacing:
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px

### 4. Common Styles (`commonStyles.ts`)
Predefined styles for commonly used components:
- **textStyles**: Styles for text
- **containerStyles**: Styles for containers
- **buttonStyles**: Styles for buttons
- **cardStyles**: Styles for cards
- **inputStyles**: Styles for inputs
- **listStyles**: Styles for lists
- **stateStyles**: Styles for loading, empty, error states

## How to Use

### 1. Import theme
```typescript
import { useTheme } from '../hooks/useTheme';
// or
import theme from '../theme';
```

### 2. Use in component
```typescript
const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <View style={[theme.containerStyles.flex, { backgroundColor: theme.colors.background.primary }]}>
      <Text style={theme.textStyles.h1}>Title</Text>
      <Text style={theme.textStyles.body}>Content</Text>
    </View>
  );
};
```

### 3. Use text styles
```typescript
// Instead of hardcoding
<Text style={{ fontSize: 16, fontWeight: '400', color: '#222' }}>Text</Text>

// Use theme
<Text style={theme.textStyles.body}>Text</Text>
```

### 4. Use colors
```typescript
// Instead of hardcoding
<View style={{ backgroundColor: '#1976D2' }} />

// Use theme
<View style={{ backgroundColor: theme.colors.primary.main }} />
```

### 5. Use spacing
```typescript
// Instead of hardcoding
<View style={{ padding: 16, margin: 8 }} />

// Use theme
<View style={{ padding: theme.spacing.md, margin: theme.spacing.sm }} />
```

## Benefits

1. **Consistency**: All components use the same set of styles
2. **Easy to change**: Just change in theme to apply to entire application
3. **Reusable**: Predefined styles can be reused
4. **Maintainable**: Code is easy to maintain and extend
5. **Type-safe**: Full TypeScript support

## Theme Change Examples

### Change primary color
```typescript
// In colors.ts
const colors = {
  primary: {
    main: '#FF6B6B', // Change from #1976D2
    // ...
  },
  // ...
};
```

### Change font size
```typescript
// In typography.ts
const typography = {
  fontSize: {
    xs: 10, // Change from 12
    sm: 12, // Change from 14
    // ...
  },
  // ...
};
```

### Change spacing
```typescript
// In spacing.ts
const spacing = {
  xs: 2, // Change from 4
  sm: 4, // Change from 8
  // ...
};
```

## Best Practices

1. **Always use theme**: Don't hardcode colors, sizes, spacing
2. **Use textStyles**: Instead of defining font styles yourself
3. **Combine styles**: Use arrays to combine theme styles with custom styles
4. **Create custom styles**: If you need special styles, create them in commonStyles
5. **Consistent naming**: Use consistent naming conventions 