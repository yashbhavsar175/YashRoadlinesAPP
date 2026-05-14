# 🚀 Quick Optimization Guide

## 📦 Available Utilities

### Animated Components
```typescript
import { FadeInView, AnimatedButton, SkeletonLoader } from '../components/AnimatedComponents';
```

### Performance Hooks
```typescript
import { useSafeAsync, FLATLIST_OPTIMIZATIONS, useSubscriptionCleanup } from '../utils/performanceOptimizations';
```

### Spacing & Typography
```typescript
import { Spacing, Typography, Shadows } from '../theme/spacing';
```

---

## 🎯 Common Patterns

### 1. Loading States

**❌ Before:**
```typescript
{loading && <ActivityIndicator size="large" color="#000" />}
```

**✅ After:**
```typescript
{loading && (
  <>
    <SkeletonLoader width="100%" height={50} style={{ marginBottom: Spacing.sm }} />
    <SkeletonLoader width="80%" height={30} />
  </>
)}
```

---

### 2. Buttons

**❌ Before:**
```typescript
<TouchableOpacity onPress={handlePress} style={styles.button}>
  <Text>Click Me</Text>
</TouchableOpacity>
```

**✅ After:**
```typescript
<AnimatedButton onPress={handlePress} style={styles.button}>
  <Text>Click Me</Text>
</AnimatedButton>
```

---

### 3. FlatList Performance

**❌ Before:**
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
/>
```

**✅ After:**
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  {...FLATLIST_OPTIMIZATIONS}
  getItemLayout={(data, index) => ({
    length: 80, // Your item height
    offset: 80 * index,
    index,
  })}
/>
```

---

### 4. Subscription Cleanup

**❌ Before:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', { ... }, callback)
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [deps]);
```

**✅ After:**
```typescript
useSubscriptionCleanup(() => {
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', { ... }, callback)
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [deps]);
```

---

### 5. Animations

**Fade In:**
```typescript
<FadeInView duration={300} delay={0}>
  <YourComponent />
</FadeInView>
```

**Slide In:**
```typescript
<SlideInView direction="left" duration={300}>
  <YourComponent />
</SlideInView>
```

**Scale In:**
```typescript
<ScaleInView duration={300} initialScale={0.8}>
  <YourComponent />
</ScaleInView>
```

---

### 6. Spacing

**❌ Before:**
```typescript
const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  }
});
```

**✅ After:**
```typescript
const styles = StyleSheet.create({
  container: {
    padding: Spacing.screenPadding,
    margin: Spacing.md,
    borderRadius: Spacing.radiusMedium,
  },
  card: {
    padding: Spacing.cardPadding,
    marginBottom: Spacing.cardMargin,
  }
});
```

---

### 7. Typography

**❌ Before:**
```typescript
const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  }
});
```

**✅ After:**
```typescript
const styles = StyleSheet.create({
  title: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    lineHeight: Typography.xxl * Typography.lineHeightNormal,
  },
  body: {
    fontSize: Typography.base,
    fontWeight: Typography.regular,
    lineHeight: Typography.base * Typography.lineHeightNormal,
  }
});
```

---

### 8. Shadows

**❌ Before:**
```typescript
const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  }
});
```

**✅ After:**
```typescript
const styles = StyleSheet.create({
  card: {
    ...Shadows.medium,
  }
});
```

---

## 🎨 Spacing System

### Base Units (8px grid)
```typescript
Spacing.xs    // 4px  - Extra small
Spacing.sm    // 8px  - Small
Spacing.md    // 16px - Medium (default)
Spacing.lg    // 24px - Large
Spacing.xl    // 32px - Extra large
Spacing.xxl   // 48px - Extra extra large
```

### Specific Use Cases
```typescript
Spacing.cardPadding      // 16px
Spacing.cardMargin       // 12px
Spacing.screenPadding    // 20px
Spacing.buttonPadding    // 14px
Spacing.inputPadding     // 16px
Spacing.sectionSpacing   // 24px
```

### Border Radius
```typescript
Spacing.radiusSmall   // 8px
Spacing.radiusMedium  // 12px
Spacing.radiusLarge   // 16px
Spacing.radiusXLarge  // 20px
Spacing.radiusFull    // 9999px (fully rounded)
```

---

## 📏 Typography Scale

### Font Sizes
```typescript
Typography.xs    // 12px
Typography.sm    // 14px
Typography.base  // 16px
Typography.lg    // 18px
Typography.xl    // 20px
Typography.xxl   // 24px
Typography.xxxl  // 28px
```

### Font Weights
```typescript
Typography.regular    // '400'
Typography.medium     // '500'
Typography.semibold   // '600'
Typography.bold       // '700'
Typography.extrabold  // '800'
```

### Line Heights
```typescript
Typography.lineHeightTight    // 1.2
Typography.lineHeightNormal   // 1.5
Typography.lineHeightRelaxed  // 1.75
```

---

## 🎭 Shadow Presets

### Small Shadow
```typescript
...Shadows.small
// shadowOffset: { width: 0, height: 2 }
// shadowOpacity: 0.1
// shadowRadius: 3
// elevation: 2
```

### Medium Shadow
```typescript
...Shadows.medium
// shadowOffset: { width: 0, height: 4 }
// shadowOpacity: 0.15
// shadowRadius: 6
// elevation: 4
```

### Large Shadow
```typescript
...Shadows.large
// shadowOffset: { width: 0, height: 8 }
// shadowOpacity: 0.2
// shadowRadius: 12
// elevation: 8
```

---

## 🔧 Advanced Hooks

### useDebounce
```typescript
const debouncedSearchTerm = useDebounce(searchTerm, 500);

useEffect(() => {
  // This will only run 500ms after user stops typing
  searchAPI(debouncedSearchTerm);
}, [debouncedSearchTerm]);
```

### useThrottle
```typescript
const throttledScroll = useThrottle((event) => {
  // This will only run once every 100ms
  handleScroll(event);
}, 100);

<ScrollView onScroll={throttledScroll} />
```

### useSafeAsync
```typescript
const { safeAsync, isMounted } = useSafeAsync();

const loadData = async () => {
  await safeAsync(
    async () => {
      const data = await fetchData();
      return data;
    },
    (data) => {
      // Only runs if component is still mounted
      setData(data);
    },
    (error) => {
      // Only runs if component is still mounted
      console.error(error);
    }
  );
};
```

---

## ✅ Checklist for New Screens

- [ ] Import optimization utilities at the top
- [ ] Replace ActivityIndicator with SkeletonLoader
- [ ] Replace TouchableOpacity with AnimatedButton (where appropriate)
- [ ] Add FLATLIST_OPTIMIZATIONS to FlatList components
- [ ] Use useSubscriptionCleanup for Supabase subscriptions
- [ ] Use Spacing constants instead of hardcoded values
- [ ] Use Typography constants for text styles
- [ ] Use Shadows presets for shadows
- [ ] Add FadeInView/SlideInView for animations
- [ ] Test on both iOS and Android

---

## 🐛 Common Issues

### Issue: AnimatedButton style type error
**Solution:** Use `StyleSheet.flatten()` for complex style arrays
```typescript
<AnimatedButton
  style={StyleSheet.flatten([
    styles.button,
    isActive && styles.activeButton
  ])}
>
```

### Issue: FlatList not optimized
**Solution:** Add getItemLayout for known item heights
```typescript
getItemLayout={(data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
})}
```

### Issue: Memory leak from subscriptions
**Solution:** Use useSubscriptionCleanup instead of useEffect
```typescript
useSubscriptionCleanup(() => {
  // Setup subscription
  return () => {
    // Cleanup
  };
}, [deps]);
```

---

## 📚 More Resources

- See `OPTIMIZATION_COMPLETE.md` for full documentation
- Check `src/components/AnimatedComponents.tsx` for component source
- Check `src/utils/performanceOptimizations.ts` for hook source
- Check `src/theme/spacing.ts` for spacing/typography constants

---

**Happy Optimizing! 🚀**
